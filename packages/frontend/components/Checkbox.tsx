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
      <div className="flex items-center mr-3 my-1">
        <Field
          className="w-4 h-4 text-blue-600 cursor-pointer bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
          type="checkbox"
          name={name}
          id={label + name}
        />
        <label
          htmlFor={label + name}
          className="ms-2 text-sm font-medium text-blue-gray-800 ml-2 cursor-pointer"
        >
          {label}
        </label>
      </div>
    </>
  );
};

export default Checkbox;
