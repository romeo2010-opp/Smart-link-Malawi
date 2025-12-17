
  // Create a new reservation (placeholder)
  addReservationBtn.addEventListener("click", () => {
    const id = Date.now();
    const item = document.createElement("div");
    item.className = "reservation-card";
    item.innerHTML = `
      <h4>Reservation #${id}</h4>
      <p>Status: Confirmed</p>
      <button class="cancel-res">Cancel</button>
    `;
    reservationList.appendChild(item);
  });

  // Cancel reservation
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("cancel-res")) {
      e.target.parentElement.remove();
    }
  });

  function showReservations() {
  // Hide home content
  document.querySelector('.hero').style.display = 'none';
  document.querySelector('.topbar').style.display = 'none';
  document.querySelector('.content').style.display = 'none';
  document.querySelector('.explore-more').style.display = 'none';

  // Remove active state from Home tab
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

  // Show reservations page
  document.getElementById('reservations-section').classList.remove('hidden');

  // Highlight Reservations tab
  const navItems = document.querySelectorAll('.nav-item div');
  navItems.forEach(n => {
    if (n.textContent.trim().toLowerCase() === 'reservations') {
        n.parentElement.classList.add('active');
    }
  });
}
