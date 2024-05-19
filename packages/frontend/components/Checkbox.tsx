"use client";
import { Field } from "formik";
import React, { FC } from "react";

type CheckboxProps = {
  label: string;
  name: string;
};

const Checkbox: FC<CheckboxProps> = ({ label, name }) => {
  return (
    <>
      <div className="flex justify-center items-center mr-3">
        <Field
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          type="checkbox"
          name={name}
          id={name}
        />
        <label
          htmlFor={name}
          className="ms-2 text-sm font-medium text-blue-gray-800 ml-2"
        >
          {label}
        </label>
      </div>
    </>
  );
};

export default Checkbox;
