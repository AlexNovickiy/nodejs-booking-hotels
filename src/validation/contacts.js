import Joi from 'joi';
import { isValidObjectId } from 'mongoose';

export const createContactSchema = Joi.object({
  name: Joi.string().min(2).max(20).required().messages({
    'string.base': 'Username should be a string',
    'string.min': 'Username should have at least {#limit} characters',
    'string.max': 'Username should have at most {#limit} characters',
    'any.required': 'Username is required',
  }),
  phoneNumber: Joi.string().min(2).max(20).required().messages({
    'string.base': 'Phone number should be a string',
    'string.min': 'Phone number should have at least {#limit} characters',
    'string.max': 'Phone number should have at most {#limit} characters',
    'any.required': 'Phone number is required',
  }),
  email: Joi.string().email().messages({
    'string.base': 'Email should be a string',
    'string.email': 'Email must be a valid email',
  }),
  isFavourite: Joi.boolean().default(false).messages({
    'boolean.base': 'isFavourite should be a boolean',
  }),
  contactType: Joi.string()
    .min(2)
    .max(20)
    .valid('work', 'home', 'personal')
    .required()
    .default('personal')
    .messages({
      'string.base': 'Contact type should be a string',
      'string.min': 'Contact type should have at least {#limit} characters',
      'string.max': 'Contact type should have at most {#limit} characters',
      'any.only': 'Contact type must be one of [work, home, personal]',
      'any.required': 'Contact type is required',
    }),
  userId: Joi.string().custom((value, helper) => {
    if (value && !isValidObjectId(value)) {
      return helper.message('User id should be a valid mongo id');
    }
    return true;
  }),
});

export const updateContactSchema = Joi.object({
  name: Joi.string().min(2).max(20).messages({
    'string.base': 'Username should be a string',
    'string.min': 'Username should have at least {#limit} characters',
    'string.max': 'Username should have at most {#limit} characters',
  }),
  phoneNumber: Joi.string().min(2).max(20).messages({
    'string.base': 'Phone number should be a string',
    'string.min': 'Phone number should have at least {#limit} characters',
    'string.max': 'Phone number should have at most {#limit} characters',
  }),
  email: Joi.string().min(2).max(20).email().messages({
    'string.base': 'Email should be a string',
    'string.min': 'Email should have at least {#limit} characters',
    'string.max': 'Email should have at most {#limit} characters',
    'string.email': 'Email must be a valid email',
  }),
  isFavourite: Joi.boolean().default(false).messages({
    'boolean.base': 'isFavourite should be a boolean',
  }),
  contactType: Joi.string()
    .min(2)
    .max(20)
    .valid('work', 'home', 'personal')
    .default('personal')
    .messages({
      'string.base': 'Contact type should be a string',
      'string.min': 'Contact type should have at least {#limit} characters',
      'string.max': 'Contact type should have at most {#limit} characters',
      'any.only': 'Contact type must be one of [work, home, personal]',
    }),
  userId: Joi.string().custom((value, helper) => {
    if (value && !isValidObjectId(value)) {
      return helper.message('User id should be a valid mongo id');
    }
    return true;
  }),
});
