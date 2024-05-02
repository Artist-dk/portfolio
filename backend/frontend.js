// Example JavaScript object
const dataToSend = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phoneNumber: '1234567890',
  message: 'This is a test message.'
};

// Fetch API to send data
fetch('http://localhost:8081/data', {
  method: 'POST',
  headers: {
      'Content-Type': 'application/json'
  },
  body: JSON.stringify(dataToSend)
})
.then(response => {
  if (!response.ok) {
      throw new Error('Network response was not ok');
  }
  return response.json(); // Parse response JSON data
})
.then(data => {
  console.log('Response from server:', data); // Log server response
})
.catch(error => {
  console.error('Error sending data to server:', error);
});
