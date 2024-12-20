const { body } = require('express-validator');

const validateAddress = [
  // Title validation
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required.')
    .isLength({ min: 3, max: 50 })
    .withMessage('Title must be between 3 and 50 characters.')
    .matches(/^[A-Za-z0-9][A-Za-z0-9\s\-]*$/)
    .withMessage('Title must start with a letter or number and can only contain letters, numbers, spaces, and hyphens.'),

  // Name validation
  // Name validation
body('name')
.trim()  // Removes leading and trailing spaces
.notEmpty()
.withMessage('Name is required.') // Ensures the field is not empty
.isLength({ min: 3, max: 50 })
.withMessage('Name must be between 3 and 50 characters.') // Validates the length of the name
.matches(/^[A-Za-z\s]+$/)
.withMessage('Name can only contain alphabets and spaces.') // Ensures only letters and spaces
.custom(value => {
  if (value.trim() === '') { // Checks for names that are just spaces
    throw new Error('Name cannot contain only spaces.');
  }
  return true;
}),



  // Phone validation
  body('phone')
    .matches(/^(?!([0-9])\1{9})[0-9]{10}$/)
    .withMessage('Phone must be a valid 10-digit number and cannot contain all identical digits.'),

  // Street validation
  body('street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required.')
    .isLength({ min: 5, max: 100 })
    .withMessage('Street must be between 5 and 100 characters long.')
    .matches(/^[A-Za-z0-9\s\.\,\'\-\#\/]+$/)
    .withMessage('Street can only contain letters, numbers, spaces, and common address symbols like .,\'-#/'),

  // City validation
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required.')
    .matches(/^[A-Za-z][A-Za-z\s\-]*$/)
    .withMessage('City must start with a letter, be 2-30 characters long, and contain only letters, spaces, or hyphens.'),

  // State validation
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required.')
    .matches(/^[A-Za-z][A-Za-z\s\-]*$/)
    .withMessage('State must start with a letter, be 2-30 characters long, and contain only letters, spaces, or hyphens.'),

  // Zip Code validation
  body('zip')
    .matches(/^[1-9][0-9]{4,5}$/)
    .withMessage('Pin Code must be a 5 or 6-digit number and cannot start with 0.'),
];

module.exports = validateAddress;
