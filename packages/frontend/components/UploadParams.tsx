"use client";
import React, { FC, useEffect, useState } from "react";
import Dropdown from "./Dropdown";
import Radio from "./Radio";
import Checkbox from "./Checkbox";
import classNames from "classnames";
import { FormikValues, useFormikContext } from "formik";
import { useFileContext } from "@/context";
import { MdCheckBox, MdOutlineDeleteOutline } from "react-icons/md";

const UploadParams: FC = ({}) => {
  const { values, setFieldValue, submitCount, resetForm } =
    useFormikContext<FormikValues>();

  const [columns, setColumns] = useState<string[]>([]);

  const { file, setFile, fileError, setFileError, isLoading, setIsLoading } =
    useFileContext();

  useEffect(() => {
    if (!file) return;

    (async () => {
      try {
        const fileContents = await file.text();
        if (!file.name.endsWith(".csv")) {
          setFile(null);
          setFileError(true);
          return;
        }
        setFileError(false);
        setIsLoading(false);
        const lines = fileContents.split("\n");
        if (lines.length > 0) {
          const columns = lines[0].split(",");
          setColumns(columns);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [file]);

  const handleFileEvent = (
    event:
      | React.DragEvent<HTMLDivElement>
      | React.ChangeEvent<HTMLInputElement>,
    resetForm: () => void
  ) => {
    event.preventDefault();
    let file;

    if ("dataTransfer" in event) {
      file = event.dataTransfer.files[0];
    } else if (event.target.files) {
      file = event.target.files[0];
    }

    if (file) {
      setFile(file);
    }
    resetForm();
  };
  return (
    <>
      <div className="flex justify-center mt-10">
        <div
          className="mx-auto w-1/2 relative border-2 border-dashed border-blue-gray-400 bg-blue-gray-200 rounded-lg p-4 flex justify-center transition-opacity duration-150 hover:opacity-80"
          onDrop={(e) => handleFileEvent(e, resetForm)}
          onDragOver={(e) => e.preventDefault()}
        >
          <input
            type="file"
            className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleFileEvent(e, resetForm)}
          />
          <span className="text-blue-gray-700">
            {file?.name || "Drop a file here or click to upload"}
          </span>
        </div>
      </div>
      {file ? (
        <div className="text-center">
          <small
            onClick={() => setFile(null)}
            className={classNames(
              "text-blue-gray-700 text-xs cursor-pointer transition-all duration-200 hover:underline hover:text-blue-900",
              { "opacity-0 pointer-events-none": submitCount }
            )}
          >
            Clear File
          </small>
        </div>
      ) : null}
      {fileError ? (
        <div className="text-red-500 text-center mt-2">
          Please upload a .csv file.
        </div>
      ) : null}
      <div
        className={classNames(
          "container w-1/2 mx-auto mt-1 transition-all duration-500",
          {
            "opacity-0 pointer-events-none": !file,
          }
        )}
      >
        <div>
          <strong className="text-lg text-blue-gray-900">
            Table Columns to Process:
          </strong>
          <div className="mt-1 mb-2 flex flex-wrap">
            {columns.map((col) => (
              <button
                className={classNames(
                  "rounded-md py-1 px-2 mr-2 mb-2 transition-colors",
                  {
                    "bg-red-800 text-white": values.dropColumns.includes(col),
                    "bg-blue-gray-200 text-blue-gray-800":
                      !values.dropColumns.includes(col),
                  }
                )}
                key={col}
                type="button"
                onClick={() => {
                  if (!values.dropColumns.includes(col)) {
                    setFieldValue("dropColumns", [...values.dropColumns, col]);
                  } else {
                    setFieldValue(
                      "dropColumns",
                      values.dropColumns.filter((c: any) => c !== col)
                    );
                  }
                }}
              >
                <span className="flex items-center">
                  {col}
                  {values.dropColumns.includes(col) ? (
                    <MdOutlineDeleteOutline className="text-lg ml-1" />
                  ) : (
                    <MdCheckBox className="text-lg ml-1 text-green-600" />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
        <hr className="border border-blue-gray-200" />
        <span className="w-full flex justify-center my-2 text-gray-700 text-lg">
          Cleaning Options:
        </span>
        <div className="w-full flex justify-center">
          <div>
            <Checkbox name="dropDuplicates" label="Drop duplicate rows" />
            <Checkbox name="detectAnomalies" label="Detect Anomalies" />
            <Radio name="fillNa" label="Allow missing values" value="none" />
            <Radio name="fillNa" label="Drop missing values" value="drop" />
            <Radio name="fillNa" label="Fill missing values" value="fill" />
          </div>
          <Dropdown />
        </div>
        <div className="mt-4">
          <div className="relative h-10">
            <button
              type="submit"
              disabled={isLoading || submitCount > 0}
              className={classNames(
                "absolute w-full bg-green-600 text-white p-2 rounded-md transition-all duration-500 ease-in-out",
                {
                  "opacity-50 cursor-not-allowed": isLoading,
                  "hover:bg-green-800": !isLoading,
                  "opacity-0 pointer-events-none": !values.confirmSend,
                  "opacity-100": values.confirmSend,
                }
              )}
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setFieldValue("confirmSend", true);
              }}
              className={classNames(
                "absolute w-full bg-blue-600 hover:bg-blue-800 text-white p-2 rounded-md transition-all duration-500 ease-in-out",
                {
                  "opacity-0 pointer-events-none": values.confirmSend,
                  "opacity-100": !values.confirmSend,
                }
              )}
            >
              Clean .CSV
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UploadParams;
