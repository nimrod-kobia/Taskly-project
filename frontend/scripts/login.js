import { signIn } from './supabase.js'

const loginForm = document.getElementById('loginForm')

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value

  const { data, error } = await signIn(email, password)

  if (error) {
    alert(error)
  } else {
    alert('Login successful!')
    window.location.href = 'tasks.html' // redirect to tasks page
  }
})
