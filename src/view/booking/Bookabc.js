import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDatabase,
  ref,
  onValue,
  get,
  set,
  push,
  remove,
  update,
} from "firebase/database";
import { ToastContainer, toast } from "react-toastify";
import { auth } from "../../Components/firebase/firebase";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";

const Book = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [accountBalance, setAccountBalance] = useState(0);
  const [bookingId, setBookingId] = useState("");
  const [totalPaid, setTotalPaid] = useState("");
  const [service, setService] = useState([]);
  const [vet, setVet] = useState("");
  const [pet, setPet] = useState("");
  const [pets, setPets] = useState([]);
  const user = auth.currentUser;

  const services = [
    { name: "Grooming", price: 20 },
    { name: "Healthcare", price: 50 },
    { name: "Training", price: 100 },
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        setUserId(user.uid);
        const db = getDatabase();
        const userRef = ref(db, "users/" + user.uid);

        try {
          const snapshot = await get(userRef);
          if (snapshot.exists()) {
            const data = snapshot.val();
            setUsername(data.username);
            setEmail(data.email);
            setAccountBalance(data.accountBalance);
          }
        } catch (error) {
          console.error("Error fetching user data: ", error);
        }
      }
    };

    const fetchPets = async () => {
      if (user) {
        const db = getDatabase();
        const petsRef = ref(db, "users/" + user.uid + "/pets");

        onValue(petsRef, (snapshot) => {
          const petsData = snapshot.val();
          if (petsData) {
            const petsList = Object.keys(petsData).map((key) => ({
              id: key,
              ...petsData[key],
            }));
            setPets(petsList);
          }
        });
      }
    };

    fetchUserData();
    fetchPets();
  }, [user]);

  const addBookingToDatabase = (
    bookingId,
    name,
    petId,
    phone,
    date,
    time,
    reason,
    services,
    totalPaid,
    amountToPay,
    paid
  ) => {
    const db = getDatabase();
    const bookingRef = push(ref(db, 'users/' + userId + '/bookings'), {
      name: name,
      phone: phone,
      date: date,
      time: time,
      reason: reason,
      bookingId: bookingId,
      services: services,
      totalPaid: totalPaid,
      amountToPay: amountToPay,
      paid: paid,
      petId: petId 
    },
      function (error) {
        if (error) {
          alert("Error adding booking");
        } else {
          alert("Booking added successfully!");
        }
      }
    );
  };

  const handleServiceChange = (event) => {
    const serviceName = event.target.value;
    const isChecked = event.target.checked;

    setService((prevServices) => {
      if (isChecked) {
        return [...prevServices, serviceName];
      } else {
        return prevServices.filter((service) => service !== serviceName);
      }
    });
  };

  const calculateTotalPaid = () => {
    const totalServiceCost = service.reduce((total, serviceName) => {
      const serviceData = services.find((s) => s.name === serviceName);
      return total + (serviceData ? serviceData.price : 0);
    }, 0);
    return totalServiceCost;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isValidDate(date)) {
      toast.error("Date must be at least 3 days from today.");
      return;
    }
    if (!pet) {
      toast.error("Please select a pet.");
      return;
    }

    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    const bookingId = "BK" + day + month + hours + minutes + seconds;
    const totalPaid = calculateTotalPaid();

    if (accountBalance >= totalPaid) {
      const newBalance = accountBalance - totalPaid;
      const db = getDatabase();
      const userRef = ref(db, "users/" + userId);

      await update(userRef, { accountBalance: newBalance });
      setTotalPaid(totalPaid);
      addBookingToDatabase(
        bookingId,
        name,
        pet ,
        phone,
        date,
        time,
        reason,
        service,
        totalPaid,
        0,
        true,
      );
      toast.success(
        "Booking successful! Your account balance has been updated.",
        {
          onClose: () => {
            setTimeout(() => {
              navigate('/');
            }, 1500);
          }
        }
      );
    } else {
      const amountToPay = (totalPaid - accountBalance) * 1000;
      const qrUrl = `https://img.vietqr.io/image/MB-0000418530364-print.png?amount=${amountToPay}&addInfo=thanhtoan%20${bookingId}&accountName=Nguyen%20Cong%20Duy%20Bao`;
      setTotalPaid(totalPaid);
      addBookingToDatabase(
        bookingId,
        name,
        pet,
        phone,
        date,
        time,
        reason,
        service,
        totalPaid,
        amountToPay / 1000,
        false
      );
      toast.info("Redirecting to payment page...", {
        onClose: () => {
          setTimeout(() => {
            navigate("/qr", { state: { qrUrl, bookingId } });
          }, 1500);
        },
      });
    }

    setName("");
    setPhone("");
    setDate("");
    setTime("");
    setReason("");
    setService([]);
    setTotalPaid("");
    setVet("");
  };

  const isValidDate = (inputDate) => {
    const now = new Date();
    const minDate = new Date(now.setDate(now.getDate() + 3)); // Minimum date is 3 days from now
    return new Date(inputDate) >= minDate;
  };

  return (
    <div className="appointment-form-container">
      <h2>Booking appointment</h2>
      {/* <img src='https://petpro.com.vn/assets/booking_pet.fcf232f8.png' /> */}
      <form className="appointment-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name:</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label htmlFor="phone">Phone:</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div>
        <label htmlFor="date">Date:</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            placeholderText="Select a date"
            dateFormat="MM/dd/yyyy"
            required
          />
          <label htmlFor="time">Time:</label>
          <input
            type="time"
            id="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="vet">Vet:</label>
          <input
            type="dropdown-menu"
            id="text"
            value={vet}
            onChange={(e) => setVet(e.target.value)}
            required
          />
          <label htmlFor="pet">Pet:</label>
          <select
            id="pet"
            value={pet}
            onChange={(e) => setPet(e.target.value)}
            required
          >
            <option value="">Select a pet</option>
            {pets.map((pet) => (
              <option key={pet.id} value={pet.petId}>
                {pet.name} - {pet.type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Services:</label>
          {services.map((service) => (
            <div key={service.name}>
              <input
                type="checkbox"
                id={service.name}
                value={service.name}
                onChange={handleServiceChange}
              />
              <label className="service-item" htmlFor={service.name}>
                {service.name} - ${service.price}
              </label>
            </div>
          ))}
        </div>

        <div className="full-width">
          <label htmlFor="reason">Reason:</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
          />
        </div>
        <button type="submit">Confirm Booking</button>
      </form>
    </div>
  );
};

export default Book;
