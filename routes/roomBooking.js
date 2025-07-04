import express from 'express';
import RoomBooking from '../models/RoomBooking.js';

const router = express.Router();

// POST - Create a new booking
router.post('/', async (req, res) => {
  try {
    const {
      roomType,
      date,
      timeFrom,
      timeTo,
    } = req.body;

    // Combine date and time strings into full datetime strings
    const fromTime = new Date(`${date} ${timeFrom}`);
    const toTime = new Date(`${date} ${timeTo}`);

    // Check for overlapping bookings
    const existingBooking = await RoomBooking.findOne({
      roomType,
      date,
      $or: [
        {
          timeFrom: { $lt: timeTo },
          timeTo: { $gt: timeFrom },
        },
      ],
    });

    if (existingBooking) {
      return res.status(409).json({ message: 'Room already booked for the selected time range.' });
    }

    // Save new booking
    const newBooking = new RoomBooking(req.body);
    await newBooking.save();

    res.status(200).json({ message: 'Booking created successfully' });
  } catch (error) {
    console.error('Booking Error:', error);
    res.status(500).json({ message: 'Something went wrong' });
  }
});

// GET - All bookings (admin use)
// GET - All bookings (admin or filtered user)
router.get('/', async (req, res) => {
  const { requestFrom, department } = req.query;

  try {
    let query = {};
    if (requestFrom) {
      query.username = requestFrom;
    }
    if (department) {
      query.department = department;
    }

    const bookings = await RoomBooking.find(query).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Error fetching bookings' });
  }
});


// router.get('/', async (req, res) => {
//   const { requestFrom } = req.query;

//   try {
//     let query = {};
//     if (requestFrom) {
//       query.username = requestFrom; // match on 'username' field
//     }

//     const bookings = await RoomBooking.find(query).sort({ createdAt: -1 });
//     res.json(bookings);
//   } catch (error) {
//     console.error('Error fetching bookings:', error);
//     res.status(500).json({ message: 'Error fetching bookings' });
//   }
// });



// GET - Assigned bookings for a staff (via query)
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

// PUT - Assign staff to booking
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

// PUT - Update full booking
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
// In routes/roomBooking.js

router.get('/staff-all', async (req, res) => {
  const { username } = req.query;

  if (!username) return res.status(400).json({ message: 'Username required' });

  try {
    const bookings = await RoomBooking.find({
      $or: [
        { username: username },        // Requested by the user
        { assignedStaff: username }    // Assigned to the user
      ]
    }).sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching staff-related bookings:', error);
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});
router.put('/update-status/:id', async (req, res) => {
  const { id } = req.params;
  const { status, username } = req.body;

  try {
    const booking = await RoomBooking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // Allow status change only if the requester is the one updating
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
// In your roomBooking routes
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
// PUT /api/room-booking/:id/confirm
router.put('/:id/confirm', async (req, res) => {
  try {
    const booking = await RoomBooking.findByIdAndUpdate(
      req.params.id,
      { status: 'Booked' },
      { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: 'Failed to confirm booking' });
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

