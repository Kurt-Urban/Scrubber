"use client";
import React, { FC } from "react";
import { CleaningParams } from "@/components/Home";
import { useFormikContext, Field } from "formik";
import { MdOutlineCancel } from "react-icons/md";
import classNames from "classnames";

const Dropdown: FC = () => {
  const { setFieldValue, errors, touched, values } =
    useFormikContext<CleaningParams>();

  const fieldError = errors?.fillCustomNaValue && touched?.fillCustomNaValue;

  return (
    <>
      <div
        className={classNames("mt-4 w-3/5", {
          visible: values.fillNa === "fill",
          hidden: values.fillNa !== "fill",
        })}
      >
        <div>
          {values.fillNaValue === "custom" ? (
            <div className="flex justify-center">
              <div className="w-3/5">
                <label className="text-blue-gray-800 text-xs font-bold">
                  Fill with:
                </label>
                <Field
                  type="text"
                  name="fillCustomNaValue"
                  className={classNames("w-full p-2 rounded-md border", {
                    "border-blue-gray-400": !!errors?.fillCustomNaValue,
                    "border-red-400 focus:border-red-400": fieldError,
                  })}
                />
                {fieldError ? (
                  <div className="absolute">
                    <span className="text-red-400 text-sm">
                      {errors.fillCustomNaValue}
                    </span>
                  </div>
                ) : null}
              </div>
              <MdOutlineCancel
                className="text-3xl text-red-400 ml-2 my-7"
                role="button"
                onClick={() => setFieldValue("fillNaValue", "")}
              />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-3/4">
                <label className="text-blue-gray-800 text-xs font-bold">
                  Fill with:
                </label>

                <Field
                  as="select"
                  name="fillNaValue"
                  className="w-full p-2 rounded-md border border-blue-gray-400"
                >
                  <option value="median">Median</option>
                  <option value="mean">Mean</option>
                  <option value="mode">Mode</option>
                  <option value="backwards">Backwards</option>
                  <option value="custom">Custom</option>
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dropdown;
