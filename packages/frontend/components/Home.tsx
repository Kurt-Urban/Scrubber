"use client";
import React from "react";
import axios from "axios";
import { Formik, FormikProps, Form } from "formik";
import { Spinner, Statistics, UploadParams } from "@/components";
import * as yup from "yup";
import { useFileContext } from "@/context";

export type CleaningParams = {
  dropDuplicates: boolean;
  detectAnomalies: boolean;
  dropColumns: string[];
  fillNa: "drop" | "fill" | "none";
  fillNaValue?: "median" | "mean" | "mode" | "backwards" | "custom" | "";
  fillCustomNaValue?: string;
};

interface FormValues extends CleaningParams {
  confirmSend: boolean;
}

const defaultValues: FormValues = {
  confirmSend: false,
  dropDuplicates: true,
  detectAnomalies: true,
  dropColumns: [],
  fillNa: "none",
  fillNaValue: "",
  fillCustomNaValue: "",
};

const validationSchema = yup.object().shape({
  fillCustomNaValue: yup
    .string()
    .when("fillNaValue", ([fillNaValue], schema) =>
      fillNaValue === "custom"
        ? schema.required("Required Field.").nullable()
        : schema
    ),
});

export default function Home() {
  const {
    file,
    setFile,
    setIsLoading,
    isLoading,
    processedFile,
    setProcessedFile,
  } = useFileContext();

  const handleSubmit = async (params: FormValues) => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("params", JSON.stringify(params));
    try {
      setIsLoading(true);
      const loadBalancerDNS = process.env.NEXT_PUBLIC_LB_DNS;
      const res = await axios.post(
        loadBalancerDNS
          ? `http://${loadBalancerDNS}/process`
          : "http://localhost:3001/process",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setIsLoading(false);
      setProcessedFile(res.data.processedFile);
      setFile(null);
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

  const displayComponent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center mt-14">
          <Spinner />
        </div>
      );
    }
    if (processedFile) {
      return <Statistics />;
    }
    return <UploadParams />;
  };

  return (
    <main className="h-screen">
      <div className="flex justify-center w-full mt-10">
        <h1 className="text-4xl font-thin">Scrubber CSV Cleaner</h1>
      </div>
      <Formik
        initialValues={defaultValues}
        onSubmit={handleSubmit}
        validationSchema={validationSchema}
      >
        {({}: FormikProps<FormValues>) => {
          return (
            <Form className="container mx-auto">{displayComponent()}</Form>
          );
        }}
      </Formik>
    </main>
  );
}
