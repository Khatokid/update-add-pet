import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getDatabase, ref, get, update, onValue } from "firebase/database";
import { Box, TextField, Button, Typography } from "@mui/material";
import { toast } from 'react-toastify';
import useForceUpdate from "../../../../hooks/useForceUpdate";
import { useLocation, useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";




const MedicalRecord = () => {
  const { userId, bookingId } = useParams();
  const [booking, setBooking] = useState(null);
  const [diagnostic, setDiagnostic] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [prescription, setPrescription] = useState("");
  const [notes, setNotes] = useState("");
  const forceUpdate = useForceUpdate();
  const navigate = useNavigate();
  const auth = getAuth();


  useEffect(() => {
    fetchBookingDetails(userId, bookingId);
  }, [userId, bookingId]);

  const fetchBookingDetails = async (userId, bookingId) => {
    try {
      const db = getDatabase();
      const bookingRef = ref(db, `users/${userId}/bookings/${bookingId}`);
      const snapshot = await get(bookingRef);
      const data = snapshot.val();
      console.log("Fetched booking data:", data);
      if (data) {
        setBooking(data);
        if (data.medicalRecord) {
          setDiagnostic(data.medicalRecord.diagnostic || "");
          setSymptoms(data.medicalRecord.symptoms || "");
          setPrescription(data.medicalRecord.prescription || "");
          setNotes(data.medicalRecord.notes || "");
        }
      } else {
        console.error("No booking data found");
      }
    } catch (error) {
      console.error("Error fetching booking details:", error);
    }
  };

  const handleSave = async () => {
    try {
      await saveMedicalRecord(userId, bookingId, {
        diagnostic,
        symptoms,
        prescription,
        notes,
      });
    } catch (error) {
      console.error("Error saving medical record:", error);
    }
  };

  const saveMedicalRecord = async (userId, bookingId, record) => {
    try {
      const db = getDatabase();
      const bookingRef = ref(db, `users/${userId}/bookings/${bookingId}`);
      const updatedBookingData = {
        ...booking,
        medicalRecord: {
          date: `${booking.date} - ${booking.time}`,
          ...record,
        },
      };
      await update(bookingRef, updatedBookingData);
      toast.success(
        "Medical history updated successfully!",
        {
          autoClose: 2000,
          onClose: () => {
            setTimeout(() => {
              forceUpdate();
              navigate(-1);
            }, 500);
          },
        }
      );

      const petRef = ref(db, `users/${userId}/pets/${booking.pet.key}`);
      const petSnapshot = await get(petRef);
      const petData = petSnapshot.val();
      const updatedMedicalHistory = petData.medicalHistory || [];
      updatedMedicalHistory.push({
        date: `${booking.date} - ${booking.time}`,
        bookingId: booking.bookingId,
        ...record,
      });
      await update(petRef, { medicalHistory: updatedMedicalHistory });

      // Update the doctor's schedule with the isChecked flag
      const doctorRef = ref(db, "users/" + auth.currentUser.uid);
      onValue(doctorRef, async (snapshot) => {
        const doctorData = snapshot.val();
        if (doctorData && doctorData.schedule) {
          const schedule = doctorData.schedule;
          const date = booking.date;
          if (schedule[date]) {
            const updatedBookings = schedule[date].map((b) =>
              b.bookingId === booking.bookingId ? { ...b, isChecked: true } : b
            );
            const updatedSchedule = { ...schedule, [date]: updatedBookings };
            await update(doctorRef, { schedule: updatedSchedule });
            console.log("Updated doctor's schedule:", updatedSchedule);
          }
        }
      });

      console.log("Updated pet medical history:", updatedMedicalHistory);
    } catch (error) {
      console.error("Error updating medical history:", error);
      toast.error("Error updating medical history. Please try again.");
    }
  };
  // useEffect(() => {
  //   const fetchDoctorSchedule = async () => {
  //     try {
  //       const currentUser = auth.currentUser;
  //       if (currentUser) {
  //         const db = getDatabase();
  //         const userRef = ref(db, `users/${currentUser.uid}`);
  //         onValue(userRef, (snapshot) => {
  //           const data = snapshot.val();
  //           if (data && data.schedule) {
  //             const schedule = data.schedule;
  //             const date = booking.date;
  //               console.log(schedule[date])
  //           }
  //         });
  //       }
  //     } catch (error) {
  //       console.error("Error fetching doctor schedule data:", error);
  //     }
  //   };

  //   fetchDoctorSchedule();
  // }, [auth]);

  if (!booking) return <div>Loading...</div>;

  return (
    <Box>
      <Typography variant="h4">Booking Details</Typography>
      <Typography variant="h6">Pet Name: {booking.pet.name}</Typography>
      <Typography variant="h6">Services: {booking.services.join(", ")}</Typography>
      <Typography variant="h6">Date: {booking.date}</Typography>
      <Typography variant="h6">Time: {booking.time}</Typography>
      <TextField
        label="Diagnostic"
        value={diagnostic}
        onChange={(e) => setDiagnostic(e.target.value)}
        multiline
        rows={4}
        fullWidth
      />
      <TextField
        label="Symptoms"
        value={symptoms}
        onChange={(e) => setSymptoms(e.target.value)}
        multiline
        rows={4}
        fullWidth
      />
      <TextField
        label="Prescription"
        value={prescription}
        onChange={(e) => setPrescription(e.target.value)}
        multiline
        rows={4}
        fullWidth
      />
      <TextField
        label="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        multiline
        rows={4}
        fullWidth
      />

      <Button variant="contained" color="primary" onClick={handleSave}>
        Save
      </Button>
    </Box>
  );
};

export default MedicalRecord;