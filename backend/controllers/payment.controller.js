require("dotenv").config();
const pool = require("../config/database");

async function getValidEnumValue(client, enumTypeName, preferredValues) {
  try {
    const res = await client.query(
      `SELECT e.enumlabel
       FROM pg_enum e
       JOIN pg_type t ON e.enumtypid = t.oid
       WHERE t.typname = $1`,
      [enumTypeName],
    );
    const validLabels = res.rows.map((r) => r.enumlabel);

    for (const val of preferredValues) {
      if (validLabels.includes(val)) return val;
    }
    const nonPending = validLabels.find(
      (l) => !l.toLowerCase().includes("pending"),
    );
    return nonPending || validLabels[0] || preferredValues[0];
  } catch (err) {
    return preferredValues[0];
  }
}

async function getTableColumns(client, tableName) {
  try {
    const res = await client.query(
      `SELECT column_name 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName],
    );
    return res.rows.map((r) => r.column_name);
  } catch (err) {
    return [];
  }
}

async function createVietQrPayment(req, res) {
  try {
    const { bookingCode, amount, paymentType } = req.body || {};
    if (!bookingCode || !amount) {
      return res.status(400).json({
        success: false,
        message: "bookingCode và amount là bắt buộc.",
      });
    }

    const bookingResult = await pool.query(
      `SELECT id, booking_code, total_price FROM public.booking
       WHERE (booking_code = $1 OR id::text = $1)
       LIMIT 1`,
      [bookingCode],
    );
    const booking = bookingResult.rows[0];
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn đặt phòng.",
      });
    }

    const expectedAmount = Math.round(Number(amount));

    const bankId = "MB";
    const accountNumber = "0833404928";
    const accountName = "SU TRACH KHANG";

    const qrCodeUrl = `https://img.vietqr.io/image/${bankId}-${accountNumber}-compact2.png?amount=${expectedAmount}&addInfo=${booking.booking_code}&accountName=${encodeURIComponent(accountName)}`;

    const checkPayment = await pool.query(
      `SELECT id FROM public.payment WHERE booking_id = $1 LIMIT 1`,
      [booking.id],
    );

    let paymentId;
    if (checkPayment.rows.length > 0) {
      paymentId = checkPayment.rows[0].id;
      await pool.query(
        `UPDATE public.payment 
         SET expected_amount = $1, qr_code = $2, qr_content = $3, updated_at = NOW()
         WHERE id = $4`,
        [expectedAmount, qrCodeUrl, booking.booking_code, paymentId],
      );
    } else {
      const pendingStatus = await getValidEnumValue(
        pool,
        "payment_status_enum",
        ["pending", "PENDING", "unpaid"],
      );

      const insertPayment = await pool.query(
        `INSERT INTO public.payment (
          id, booking_id, payment_method, expected_amount, paid_amount, qr_code, qr_content, status, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'VietQR', $2, 0, $3, $4, $5::text::public.payment_status_enum, NOW(), NOW()
        ) RETURNING id`,
        [
          booking.id,
          expectedAmount,
          qrCodeUrl,
          booking.booking_code,
          pendingStatus,
        ],
      );
      paymentId = insertPayment.rows[0].id;
    }

    return res.json({
      success: true,
      paymentId,
      bookingCode: booking.booking_code,
      expectedAmount,
      paymentType: paymentType || "FULL",
      bankInfo: {
        bankId,
        bankName: "Ngân hàng TMCP Quân Đội (MBBank)",
        accountNumber,
        accountName,
      },
      qrCodeUrl,
      qrContent: booking.booking_code,
    });
  } catch (error) {
    console.error("❌ LỖI CREATE_VIETQR_PAYMENT:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi tạo thanh toán VietQR",
      errorDetail: error.message,
    });
  }
}

// ─── NÚT XÁC NHẬN: PHÂN ĐỊNH RÕ 100% VÀ 30% TRONG DATABASE ───
async function confirmManualPayment(req, res) {
  const client = await pool.connect();
  try {
    const { bookingCode, amount, paymentType } = req.body || {};
    if (!bookingCode) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu bookingCode." });
    }

    const bookingRes = await client.query(
      `SELECT id, booking_code, total_price FROM public.booking WHERE booking_code = $1 LIMIT 1`,
      [bookingCode],
    );
    const booking = bookingRes.rows[0];
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Không tìm thấy đơn phòng." });
    }

    const totalPrice = Number(booking.total_price || 0);
    const paidAmount = Math.round(Number(amount) || totalPrice);

    // PHÂN BIỆT CHUẨN XÁC:
    // Nếu thanh toán 100% (paidAmount >= totalPrice) -> payment_type = 'FULL', deposit_amount = 0, remaining_amount = 0
    // Nếu cọc 30% (paidAmount < totalPrice) -> payment_type = 'DEPOSIT_30', deposit_amount = paidAmount, remaining_amount = totalPrice - paidAmount
    const isActuallyDeposit =
      paymentType === "DEPOSIT_30" && paidAmount < totalPrice;

    const finalPaymentType = isActuallyDeposit ? "DEPOSIT_30" : "FULL";
    const depositAmountVal = isActuallyDeposit ? paidAmount : 0;
    const remainingAmountVal = isActuallyDeposit ? totalPrice - paidAmount : 0;

    const validBookingPaymentStatus = await getValidEnumValue(
      client,
      "booking_payment_status_enum",
      ["paid", "PAID", "completed", "COMPLETED", "success"],
    );

    const validPaymentStatus = await getValidEnumValue(
      client,
      "payment_status_enum",
      ["completed", "COMPLETED", "success", "SUCCESS", "paid", "PAID"],
    );

    const validTxnStatus = await getValidEnumValue(
      client,
      "transaction_status_enum",
      ["success", "SUCCESS", "completed", "COMPLETED"],
    );

    const bookingCols = await getTableColumns(client, "booking");

    const setClauses = [];
    const updateParams = [];
    let paramIdx = 1;

    if (bookingCols.includes("payment_status")) {
      setClauses.push(
        `payment_status = $${paramIdx}::text::public.booking_payment_status_enum`,
      );
      updateParams.push(validBookingPaymentStatus);
      paramIdx++;
    }

    if (bookingCols.includes("status")) {
      setClauses.push(`status = 'confirmed'::public.booking_status_enum`);
    }

    if (bookingCols.includes("customer_paid")) {
      setClauses.push(`customer_paid = $${paramIdx}`);
      updateParams.push(paidAmount);
      paramIdx++;
    }

    if (bookingCols.includes("deposit_amount")) {
      setClauses.push(`deposit_amount = $${paramIdx}`);
      updateParams.push(depositAmountVal);
      paramIdx++;
    }

    if (bookingCols.includes("remaining_amount")) {
      setClauses.push(`remaining_amount = $${paramIdx}`);
      updateParams.push(remainingAmountVal);
      paramIdx++;
    }

    if (bookingCols.includes("payment_type")) {
      setClauses.push(`payment_type = $${paramIdx}`);
      updateParams.push(finalPaymentType);
      paramIdx++;
    }

    if (bookingCols.includes("confirmed_at")) {
      setClauses.push(`confirmed_at = NOW()`);
    }

    if (bookingCols.includes("updated_at")) {
      setClauses.push(`updated_at = NOW()`);
    }

    await client.query("BEGIN");

    if (setClauses.length > 0) {
      updateParams.push(booking.id);
      const updateBookingQuery = `
        UPDATE public.booking 
        SET ${setClauses.join(", ")}
        WHERE id = $${paramIdx}
      `;
      await client.query(updateBookingQuery, updateParams);
    }

    const payRes = await client.query(
      `UPDATE public.payment 
       SET status = $1::text::public.payment_status_enum,
           paid_amount = $2,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE booking_id = $3
       RETURNING id`,
      [validPaymentStatus, paidAmount, booking.id],
    );

    let paymentId = payRes.rows[0]?.id;
    if (!paymentId) {
      const newPay = await client.query(
        `INSERT INTO public.payment (
          id, booking_id, payment_method, expected_amount, paid_amount, status, paid_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, 'VietQR', $2, $2, $3::text::public.payment_status_enum, NOW(), NOW(), NOW()
        ) RETURNING id`,
        [booking.id, paidAmount, validPaymentStatus],
      );
      paymentId = newPay.rows[0].id;
    }

    const txnCode = `MB_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await client.query(
      `INSERT INTO public.payment_transaction (
        id, payment_id, transaction_id, gateway, amount, status, raw_response, created_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'VietQR', $3, $4::text::public.transaction_status_enum, $5, NOW()
      )`,
      [
        paymentId,
        txnCode,
        paidAmount,
        validTxnStatus,
        JSON.stringify({
          bookingCode,
          amount: paidAmount,
          paymentType: finalPaymentType,
          bank: "MBBank",
          accountNumber: "0833404928",
        }),
      ],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      paid: true,
      paidAmount,
      remainingAmount: remainingAmountVal,
      paymentType: finalPaymentType,
      message: "Xác nhận thanh toán thành công!",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ LỖI CONFIRM_MANUAL_PAYMENT:", error);
    return res.status(500).json({ success: false, message: error.message });
  } finally {
    client.release();
  }
}

async function checkPaymentStatus(req, res) {
  try {
    const { bookingCode } = req.query;
    if (!bookingCode) {
      return res
        .status(400)
        .json({ success: false, message: "Thiếu bookingCode." });
    }

    const result = await pool.query(
      `SELECT p.status, p.paid_amount, b.payment_status
       FROM public.payment p
       JOIN public.booking b ON p.booking_id = b.id
       WHERE b.booking_code = $1 LIMIT 1`,
      [bookingCode],
    );

    if (result.rows.length === 0) {
      return res.json({ success: true, paid: false });
    }

    const row = result.rows[0];
    const isCompleted =
      ["completed", "COMPLETED", "success", "SUCCESS", "paid", "PAID"].includes(
        row.status,
      ) || ["paid", "PAID", "completed"].includes(row.payment_status);

    return res.json({
      success: true,
      paid: isCompleted,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  createVietQrPayment,
  confirmManualPayment,
  checkPaymentStatus,
};
