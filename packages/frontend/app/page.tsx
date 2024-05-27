"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { Formik, FormikProps, Form } from "formik";
import { Checkbox, Dropdown, Radio } from "@/components";
import * as yup from "yup";
import classNames from "classnames";
import { MdCheckBox, MdOutlineDeleteOutline } from "react-icons/md";

export type CleaningParams = {
  dropDuplicates: boolean;
  dropColumns: string[];
  fillNa: "drop" | "fill" | "none";
  fillNaValue?: "median" | "mean" | "mode" | "backwards" | "custom" | "";
  fillCustomNaValue?: string;
};

const defaultParams: CleaningParams = {
  dropDuplicates: true,
  dropColumns: [],
  fillNa: "none",
  fillNaValue: "",
  fillCustomNaValue: "",
};

const validationSchema = yup.object().shape({
  fillCustomNaValue: yup
    .string()
    .when("fillNaValue", ([fillNaValue], schema) =>
      fillNaValue === "custom" ? schema.required("Required Field.") : schema
    ),
});

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileError, setFileError] = useState<boolean>(false);

  useEffect(() => {
    if (!file) return;

    (async () => {
      try {
        const fileContents = await file.text();
        const lines = fileContents.split("\n");
        if (lines.length > 0) {
          const columns = lines[0].split(",");
          setColumns(columns);
        }
        if (!file.name.endsWith(".csv")) {
          setFile(null);
          setFileError(true);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [file]);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    setFile(droppedFile);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleSubmit = async (params: CleaningParams) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("params", JSON.stringify(params));

    try {
      const res = await axios.post("http://localhost:3001/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      console.log(res);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(error.message);
        if (error.response) {
          console.error(error.response.data);
        }
      } else {
        console.error(error);
      }
    }
  };

  return (
    <main className="h-screen">
      <div className="flex justify-center w-full mt-10">
        <h1 className="text-4xl font-thin">Scrubber CSV Cleaner</h1>
      </div>
      <Formik
        initialValues={defaultParams}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
      >
        {({ values, setFieldValue }: FormikProps<CleaningParams>) => {
          return (
            <Form className="container mx-auto">
              <div className="flex justify-center mt-10">
                <div
                  className="mx-auto w-1/2 relative border-2 border-dashed border-blue-gray-400 bg-blue-gray-200 rounded-lg p-4 flex justify-center transition-opacity duration-150 hover:opacity-80"
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <input
                    type="file"
                    className="absolute top-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                  />
                  <span className="text-blue-gray-700">
                    {file?.name || "Drop a file here or click to upload"}
                  </span>
                </div>
              </div>

              <div
                className={classNames(
                  "container  w-1/2 mx-auto mt-8 transition-all duration-500",
                  {
                    "opacity-0 pointer-events-none": !file,
                  }
                )}
              >
                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-800 text-white p-2 rounded-md relative transition-opacity duration-500"
                >
                  Clean .CSV
                </button>
                <div className="mt-4">
                  <strong className="text-lg text-blue-gray-900">
                    Table Columns to Process:
                  </strong>
                  <div className="mt-1 mb-2 flex flex-wrap">
                    {columns.map((col) => (
                      <button
                        className={classNames(
                          "rounded-md py-1 px-2 mr-2 mb-2 transition-colors",
                          {
                            "bg-red-800 text-white":
                              values.dropColumns.includes(col),
                            "bg-blue-gray-200 text-blue-gray-800":
                              !values.dropColumns.includes(col),
                          }
                        )}
                        key={col}
                        type="button"
                        onClick={() => {
                          if (!values.dropColumns.includes(col)) {
                            setFieldValue("dropColumns", [
                              ...values.dropColumns,
                              col,
                            ]);
                          } else {
                            setFieldValue(
                              "dropColumns",
                              values.dropColumns.filter((c) => c !== col)
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
                <div className="flex transition-all duration-1000 ">
                  <div className="w-1/3 mt-3">
                    <Checkbox
                      name="dropDuplicates"
                      label="Drop duplicate rows"
                    />
                    <Radio
                      name="fillNa"
                      label="Allow missing values"
                      value="none"
                    />
                    <Radio
                      name="fillNa"
                      label="Drop missing values"
                      value="drop"
                    />
                    <Radio
                      name="fillNa"
                      label="Fill missing values"
                      value="fill"
                    />
                  </div>
                  <Dropdown />
                </div>
              </div>
            </Form>
          );
        }}
      </Formik>
    </main>
  );
}
