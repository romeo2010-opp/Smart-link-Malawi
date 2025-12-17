// Simple mock auth logic
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');

if(loginBtn){
  loginBtn.addEventListener('click',()=>{
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!email || !password){alert('Enter email & password'); return;}

    // Mock API call
    localStorage.setItem('user', JSON.stringify({name:'John Doe',email}));
    alert('Login successful!');
    window.location.href='account.html';
  });
}

if(signupBtn){
  signupBtn.addEventListener('click',()=>{
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if(!name || !email || !password){alert('Fill all fields'); return;}

    // Mock API call
    localStorage.setItem('user', JSON.stringify({name,email}));
    alert('Account created!');
    window.location.href='account.html';
  });
}
