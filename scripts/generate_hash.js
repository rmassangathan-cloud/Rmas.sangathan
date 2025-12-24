const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter password to hash: ', async (password) => {
    try {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        console.log('Hashed Password:');
        console.log(hash);
        console.log('\nCopy this hash and paste in database or code');
    } catch (err) {
        console.error('Error:', err);
    }
    rl.close();
});
