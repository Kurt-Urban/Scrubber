import React, { FC } from "react";
import { CleaningParams } from "@/app/page";
import { useFormikContext, Field } from "formik";
import { MdOutlineCancel } from "react-icons/md";

const Dropdown: FC<{ values: CleaningParams }> = ({ values }) => {
  const { setFieldValue } = useFormikContext();
  return (
    <>
      <div className={`mt-4 ${values.fillNa ? "visible" : "hidden"}`}>
        <div className="container w-2/3 mx-auto flex justify-center items-center">
          {values.fillNaValue === "custom" ? (
            <>
              <label className="text-blue-gray-800">Custom Value:</label>
              <Field
                type="text"
                name="fillCustomNaValue"
                className="w-1/2 ms-2 p-2 rounded-md border border-blue-gray-400"
              />
              <MdOutlineCancel
                className="text-3xl text-red-400 ml-2"
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
    </>
  );
};

export default Dropdown;
