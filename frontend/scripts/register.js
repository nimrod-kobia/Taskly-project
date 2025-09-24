// import { signUp } from './supabase.js'

// const registerForm = document.getElementById('registerForm')

// registerForm.addEventListener('submit', async (e) => {
//   e.preventDefault()

//   const email = document.getElementById('email').value
//   const password = document.getElementById('password').value

//   const { data, error } = await signUp(email, password)

//   if (error) {
//     alert(error)
//   } else {
//     alert('Registration successful! Please check your email to verify your account.')
//     window.location.href = 'login.html' // redirect to login page
//   }
// })



import { signUp } from './supabase.js'

const registerForm = document.getElementById('registerForm')

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault() // stop page reload

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const { data, error } = await signUp(email, password)

  if (error) {
    alert('Signup failed: ' + error.message)
  } else {
    alert('Signup successful! Please check your email.')
    console.log('User created:', data)
    window.location.href = 'login.html' // redirect to login
  }
})
