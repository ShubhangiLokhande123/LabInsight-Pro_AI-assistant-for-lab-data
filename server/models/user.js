const redis = require("../db");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const { randomUUID } = require("crypto");

const generateAuthToken = (userId) => {
	return jwt.sign({ _id: userId }, process.env.JWTPRIVATEKEY, { expiresIn: "7d" });
};

const createUser = async (data) => {
	const id = randomUUID();
	const user = { id, ...data };
	await redis.set(`user:${id}`, JSON.stringify(user));
	await redis.set(`email:${data.email}`, id);
	return user;
};

const findUserByEmail = async (email) => {
	const id = await redis.get(`email:${email}`);
	if (!id) return null;
	const data = await redis.get(`user:${id}`);
	return data ? JSON.parse(data) : null;
};

const findUserById = async (id) => {
	const data = await redis.get(`user:${id}`);
	return data ? JSON.parse(data) : null;
};

const validate = (data) => {
	const schema = Joi.object({
		firstName: Joi.string().required().label("First Name"),
		lastName: Joi.string().required().label("Last Name"),
		email: Joi.string().email().required().label("Email"),
		password: passwordComplexity().required().label("Password"),
		age: Joi.number().min(0).required().label("Age"),
		height: Joi.string().required().label("Height"),
		weight: Joi.string().required().label("Weight"),
		ethnicity: Joi.string().required().label("Ethnicity"),
		sex: Joi.string().valid("Male", "Female", "Other").required().label("Sex"),
	});
	return schema.validate(data);
};

module.exports = { createUser, findUserByEmail, findUserById, generateAuthToken, validate };
