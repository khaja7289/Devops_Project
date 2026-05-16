const bcrypt = require('bcrypt');

const passwords = {
  '123456': 'testuser@gmail.com',
  'admin123': 'admin@gmail.com',
  'inst123': 'instructor@gmail.com',
  'stud123': 'multiple students'
};

async function generateHashes() {
  for (const [pwd, email] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(pwd, 10);
    console.log(`'${email}': '${pwd}' -> '${hash}'`);
  }
}

generateHashes();
