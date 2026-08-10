-- Sửa hàm confirm_booking_inventory: giảm available_count khi tăng sold_count
-- để không vi phạm trigger validate_room_inventory
CREATE OR REPLACE FUNCTION confirm_booking_inventory()
RETURNS trigger AS $$
BEGIN
    IF NEW.status = 'confirmed'
       AND OLD.status <> 'confirmed'
    THEN
        UPDATE room_inventory ri
        SET
            available_count = GREATEST(0, available_count - br.quantity),
            sold_count = sold_count + br.quantity,
            locked_count = GREATEST(0, locked_count - br.quantity)
        FROM booking_room br
        WHERE br.booking_id = NEW.id
          AND ri.room_id = br.room_id
          AND ri.inventory_date = br.book_date;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;