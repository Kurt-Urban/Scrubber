import React, { FC } from "react";
import { CleaningParams } from "@/app/page";
import { useFormikContext, Field } from "formik";
import { MdOutlineCancel } from "react-icons/md";
import classNames from "classnames";

const Dropdown: FC<{ values: CleaningParams }> = ({ values }) => {
  const { setFieldValue, errors, touched } = useFormikContext<CleaningParams>();

  const fieldError = errors?.fillCustomNaValue && touched?.fillCustomNaValue;

  return (
    <>
      <div className={`mt-4 ${values.fillNa ? "visible" : "hidden"}`}>
        <div className="container mx-auto">
          <div className="flex justify-center items-center">
            {values.fillNaValue === "custom" ? (
              <>
                <label className="text-blue-gray-800">Fill with:</label>
                <div className="container w-1/2">
                  <Field
                    type="text"
                    name="fillCustomNaValue"
                    className={classNames("w-full ms-2 p-2 rounded-md border", {
                      "border-blue-gray-400": !!errors?.fillCustomNaValue,
                      "border-red-400 focus:border-red-400": fieldError,
                    })}
                  />
                  {fieldError ? (
                    <span className="absolute ml-2 mt-1 text-red-400 text-sm">
                      {errors.fillCustomNaValue}
                    </span>
                  ) : null}
                </div>
                <MdOutlineCancel
                  className="text-3xl text-red-400 ml-4"
                  role="button"
                  onClick={() => setFieldValue("fillNaValue", "")}
                />
              </>
            ) : (
              <>
                <label className="text-blue-gray-800">Fill with:</label>
                <Field
                  as="select"
                  name="fillNaValue"
                  className="w-1/2 ms-2 p-2 rounded-md border border-blue-gray-400"
                >
                  <option value="median">Median</option>
                  <option value="mean">Mean</option>
                  <option value="mode">Mode</option>
                  <option value="backwards">Backwards</option>
                  <option value="custom">Custom</option>
                </Field>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dropdown;
