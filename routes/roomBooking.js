import express from 'express';
import RoomBooking from '../models/RoomBooking.js';

const router = express.Router();

// Utility to convert time to minutes
function timeToMinutes(time) {
  const [hours, minutes] = time.match(/\d+/g).map(Number);
  const ampm = time.includes("PM") ? "PM" : "AM";
  let hour = hours % 12;
  if (ampm === "PM") hour += 12;
  return hour * 60 + minutes;
}

// POST - Create new booking with time conflict check
router.post('/', async (req, res) => {
  try {
    const { roomType, date, timeFrom, timeTo } = req.body;

    const newStart = timeToMinutes(timeFrom);
    const newEnd = timeToMinutes(timeTo);

    if (newStart >= newEnd) {
      return res.status(400).json({ message: 'Invalid time range' });
    }

    const existingBookings = await RoomBooking.find({ roomType, date });
    const isOverlap = existingBookings.some(booking => {
      const existingStart = timeToMinutes(booking.timeFrom);
      const existingEnd = timeToMinutes(booking.timeTo);
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (isOverlap) {
      return res.status(409).json({ message: 'Conflict: Room already booked during this time.' });
    }

    const newBooking = new RoomBooking(req.body);
    await newBooking.save();
    res.status(201).json({ message: 'Room booked successfully' });

  } catch (error) {
    console.error('Error saving booking:', error);
    res.status(500).json({ error: 'Failed to save booking' });
  }
});

// GET - All bookings with filters
router.get('/', async (req, res) => {
  const { requestFrom, department } = req.query;

  try {
    let query = {};
    if (requestFrom) query.username = requestFrom;
    if (department) query.department = department;

    const bookings = await RoomBooking.find(query).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});

// GET - Staff assigned bookings
router.get('/assigned', async (req, res) => {
  const { staff } = req.query;
  try {
    const bookings = await RoomBooking.find({ assignedStaff: staff }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching assigned bookings:', error);
    res.status(500).json({ message: 'Error fetching assigned bookings' });
  }
});

// GET - All staff-related bookings
router.get('/staff-all', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ message: 'Username required' });

  try {
    const bookings = await RoomBooking.find({
      $or: [
        { username: username },
        { assignedStaff: username }
      ]
    }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching staff-related bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// PUT - Assign staff
router.put('/:id/assign-staff', async (req, res) => {
  const { staffName } = req.body;
  try {
    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.assignedStaff = staffName;
    await booking.save();
    res.status(200).json({ message: 'Staff assigned successfully' });
  } catch (error) {
    console.error('Error assigning staff:', error);
    res.status(500).json({ message: 'Failed to assign staff' });
  }
});

// PUT - Update booking
router.put('/:id', async (req, res) => {
  try {
    const updatedBooking = await RoomBooking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedBooking) return res.status(404).json({ message: 'Booking not found' });

    res.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    res.status(500).json({ message: 'Failed to update booking' });
  }
});

// PUT - Update status by requester
router.put('/update-status/:id', async (req, res) => {
  const { id } = req.params;
  const { status, username } = req.body;

  try {
    const booking = await RoomBooking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.username !== username) {
      return res.status(403).json({ message: 'Unauthorized to update this booking' });
    }

    booking.status = status;
    await booking.save();

    res.json({ message: 'Status updated successfully', booking });
  } catch (error) {
    console.error('Status update failed:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST - Admin remarks
router.post('/:id/admin-remarks', async (req, res) => {
  try {
    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.adminRemarks = req.body.remarks;
    await booking.save();

    res.status(200).json({ message: 'Admin remarks saved successfully' });
  } catch (error) {
    console.error('Error saving admin remarks:', error);
    res.status(500).json({ message: 'Failed to save admin remarks' });
  }
});

// POST - User remarks
router.post('/:id/user-remarks', async (req, res) => {
  try {
    const booking = await RoomBooking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.userRemarks = req.body.remarks;
    await booking.save();

    res.status(200).json({ message: 'User remarks saved successfully' });
  } catch (error) {
    console.error('Error saving user remarks:', error);
    res.status(500).json({ message: 'Failed to save user remarks' });
  }
});

export default router;



// import express from 'express';
// import RoomBooking from '../models/RoomBooking.js';

// const router = express.Router();

// // Create a new room booking
// router.post('/', async (req, res) => {
//   try {
//     const newBooking = new RoomBooking(req.body); // username will be here
//     await newBooking.save();
//     res.status(201).json({ message: 'Room booked successfully' });
//   } catch (error) {
//     console.error('Error saving booking:', error);
//     res.status(500).json({ error: 'Failed to save booking' });
//   }
// });

// // Get all bookings
// router.get('/', async (req, res) => {
//   try {
//     const bookings = await RoomBooking.find().sort({ createdAt: -1 });
//     res.json(bookings);
//   } catch (error) {
//     console.error('Error fetching bookings:', error);
//     res.status(500).json({ message: 'Error fetching bookings' });
//   }
// });
// // Add this to your room booking routes file
// router.get('/assigned/:staffId', async (req, res) => {
//   const { staffId } = req.params;
//   try {
//     const bookings = await RoomBooking.find({ assignedStaff: staffId })
     
//       .sort({ createdAt: -1 });
//     res.json(bookings);
//   } catch (error) {
//     console.error('Error fetching assigned bookings:', error);
//     res.status(500).json({ message: 'Failed to fetch assigned bookings' });
//   }
// });

// // Assign staff to a booking
// router.put('/:id/assign-staff', async (req, res) => {
//   const { staffName } = req.body;

//   try {
//     const booking = await RoomBooking.findById(req.params.id);
//     if (!booking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }

//     booking.assignedStaff = staffName;
//     await booking.save();

//     res.status(200).json({ message: 'Staff assigned successfully' });
//   } catch (error) {
//     console.error('Error assigning staff:', error);
//     res.status(500).json({ message: 'Failed to assign staff' });
//   }
// });
// // Update entire booking by ID
// router.put('/:id', async (req, res) => {
//   try {
//     const updatedBooking = await RoomBooking.findByIdAndUpdate(
//       req.params.id,
//       req.body,
//       { new: true } // return updated doc
//     );
//     if (!updatedBooking) {
//       return res.status(404).json({ message: 'Booking not found' });
//     }
//     res.json(updatedBooking);
//   } catch (error) {
//     console.error('Error updating booking:', error);
//     res.status(500).json({ message: 'Failed to update booking' });
//   }
// });
// // routes/roomBooking.js
// router.get('/assigned', async (req, res) => {
//   const { staff } = req.query;
//   try {
//     const bookings = await RoomBooking.find({ assignedStaff: staff });
//     res.json(bookings);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching bookings for staff' });
//   }
// });

// export default router;

