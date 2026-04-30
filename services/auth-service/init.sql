CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(100),
  role VARCHAR(50)
);


INSERT INTO users (email, password, role) 
VALUES 
('testuser@gmail.com', '123456', 'student')
('admin@gmail.com', 'admin123', 'admin'), 
('instructor@gmail.com', 'inst123', 'instructor'), 
('student1@gmail.com', 'stud123', 'student'),
('student2@gmail.com', 'stud123', 'student'),
('student3@gmail.com', 'stud123', 'student'),
('student4@gmail.com', 'stud123', 'student'),
('student5@gmail.com', 'stud123', 'student'),
('student6@gmail.com', 'stud123', 'student'),
('student7@gmail.com', 'stud123', 'student'),
('student8@gmail.com', 'stud123', 'student'),
('testuser@gmail.com', '123456', 'student')
ON CONFLICT (email) DO NOTHING;
