  
// ===================== BOTTOM NAV (Reservations Page) ===================== //

  const reservationsSection = document.getElementById("reservations-section");
  const reservationList = document.getElementById("reservationList");
  const addReservationBtn = document.getElementById("addReservationBtn");
  
  // Return to home when clicking Home
  document.querySelectorAll(".nav-item")[0].addEventListener("click", () => {
    reservationsSection.classList.add("hidden");
    document.querySelector(".active").classList.remove('active');
    document.querySelectorAll(".nav-item")[0].classList.add('active');
    document.querySelector(".content").style.display = "block";
    document.querySelector('.topbar').style.display = 'flex';
    document.querySelector(".hero").style.display = "flex";
  });
