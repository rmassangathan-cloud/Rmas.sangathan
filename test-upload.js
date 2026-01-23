#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function testUpload() {
  try {
    // Create a dummy image file
    const testImagePath = path.join(__dirname, 'test-photo.jpg');
    // Create a 10KB dummy JPEG
    const dummyJpeg = Buffer.alloc(10000);
    fs.writeFileSync(testImagePath, dummyJpeg);
    console.log('✅ Created dummy test image:', testImagePath);

    // Create FormData
    const form = new FormData();
    form.append('fullName', 'Test User');
    form.append('fatherName', 'Test Father');
    form.append('dob', '1990-01-01');
    form.append('gender', 'Male');
    form.append('mobile', '9876543210');
    form.append('email', 'test@example.com');
    form.append('state', 'Bihar');
    form.append('district', 'Patna');
    form.append('panchayat', 'Test');
    form.append('village', 'Test Village');
    form.append('pincode', '800001');
    form.append('reason', 'Testing upload functionality');
    form.append('agreedToTerms', 'on');
    form.append('photo', fs.createReadStream(testImagePath), 'test-photo.jpg');

    console.log('📤 Uploading to http://localhost:5000/join...');
    const response = await axios.post('http://localhost:5000/join', form, {
      headers: form.getHeaders(),
      timeout: 10000
    });

    console.log('✅ Upload successful!');
    console.log('Response:', response.data);
    
    // Cleanup
    fs.unlinkSync(testImagePath);
  } catch (err) {
    console.error('❌ Upload failed:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  }
}

testUpload();
