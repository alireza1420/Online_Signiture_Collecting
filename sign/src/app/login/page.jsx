"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // const  handleLogin = async () => {
  //   try{
  //     const response = await fetch('http://localhost:3001/api/login',{
  //       method:'POST',
  //       headers:{
  //         'Content-Type':'application/json',
  //         body:JSON.stringify({email,password})
  //       },
       
        
  //     });
  //     const data = await response.json();
  //     if(data.success){
  //       router.push('/dashbord');
  //     }else{
  //       setError('Invalid email or password');
  //     }
  //   }catch(error){
  //     console.error('Login error:',error);
  //     setError('An error occurred during login');
  //   }

   const  handleLogin = () => {

    if (email === 'admin' && password === 'admin') {
      console.log('Login successful');
      router.push('/dashbord');
    } else {
      setError('Invalid email or password');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Login</h2>
      <input
        type="text"
        placeholder="Email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        style={styles.input}
      />
      <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={e => setPassword(e.target.value)}
      style={styles.input}
      />
      <button onClick={handleLogin} style={styles.button}>
        Submit
      </button>
    </div>
  );
};

const styles = {
  container: {
    padding: 20,
    maxWidth: 300,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  title: {
    textAlign: 'center',
  },
  input: {
    padding: 8,
    fontSize: 16,
  },
  button: {
    padding: 10,
    fontSize: 16,
    backgroundColor: '#0070f3',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer',
  },
};

export default Login;
