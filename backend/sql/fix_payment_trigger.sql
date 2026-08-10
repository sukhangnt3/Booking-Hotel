CREATE OR REPLACE FUNCTION update_booking_payment_status()
RETURNS trigger AS $$
DECLARE
    booking_total INT;
    payment_total INT;
BEGIN
    SELECT total_price
    INTO booking_total
    FROM booking
    WHERE id = NEW.booking_id;

    SELECT COALESCE(SUM(paid_amount), 0)
    INTO payment_total
    FROM payment
    WHERE booking_id = NEW.booking_id
      AND status = 'completed';

    UPDATE booking
    SET payment_status = CASE
        WHEN payment_total = 0 THEN 'unpaid'::booking_payment_status_enum
        WHEN payment_total < booking_total THEN 'partially_paid'::booking_payment_status_enum
        ELSE 'paid'::booking_payment_status_enum
    END
    WHERE id = NEW.booking_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;