const user = JSON.parse(localStorage.getItem('user'));
if(!user){window.location.href='login.html';}

document.getElementById('accountName').textContent = user.name;
document.getElementById('accountEmail').textContent = user.email;

document.getElementById('logoutBtn').addEventListener('click',()=>{
  localStorage.removeItem('user');
  window.location.href='login.html';
});
