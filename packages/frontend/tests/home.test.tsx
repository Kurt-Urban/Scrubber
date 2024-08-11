import React from "react";
import "@testing-library/jest-dom/extend-expect";
import { render, screen, fireEvent } from "@testing-library/jest-dom";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { Home } from "../components";
import { FileProvider } from "../context";

const mockAxios = new MockAdapter(axios);

describe("Home Component", () => {
  beforeEach(() => {
    mockAxios.reset();
  });

  it("should render the initial state correctly", () => {
    render(
      <FileProvider>
        <Home />
      </FileProvider>
    );

    expect(screen.getByText("Scrubber CSV Cleaner")).toBeInTheDocument();
    expect(screen.getByText("UploadParams")).toBeInTheDocument(); // Ensure UploadParams component renders
  });

  it("should show Spinner while loading", async () => {
    render(
      <FileProvider>
        <Home />
      </FileProvider>
    );

    // Simulate setting loading state
    fireEvent.click(screen.getByText("Set Is Loading"));

    expect(await screen.findByTestId("spinner")).toBeInTheDocument(); // Ensure Spinner component renders
  });

  it("should show Statistics after file processing", async () => {
    render(
      <FileProvider>
        <Home />
      </FileProvider>
    );

    // Simulate setting processed file
    fireEvent.click(screen.getByText("Set Processed File"));

    expect(await screen.findByText("Statistics")).toBeInTheDocument(); // Ensure Statistics component renders
  });

  it("should handle file upload and processing", async () => {
    mockAxios
      .onPost("/process")
      .reply(200, { url: "http://example.com", metadata: {} });

    render(
      <FileProvider>
        <Home />
      </FileProvider>
    );

    const file = new File(["file content"], "test.csv", { type: "text/csv" });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Statistics")).toBeInTheDocument(); // Ensure Statistics component renders
    });

    expect(mockAxios.history.post.length).toBe(1);
    expect(mockAxios.history.post[0].url).toBe("http://localhost:3001/process");
  });

  it("should handle file upload errors", async () => {
    mockAxios.onPost("/process").reply(500);

    render(
      <FileProvider>
        <Home />
      </FileProvider>
    );

    const file = new File(["file content"], "test.csv", { type: "text/csv" });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("UploadParams")).toBeInTheDocument(); // Ensure UploadParams component renders after error
    });

    expect(mockAxios.history.post.length).toBe(1);
  });
  it("should handle anomalies checkbox", async () => {
    render(
      <FileProvider>
        <Home />
      </FileProvider>
    );

    // Simulate checking the anomalies checkbox
    fireEvent.click(screen.getByLabelText("Anomalies"));

    // Simulate setting processed file
    fireEvent.click(screen.getByText("Set Processed File"));

    expect(await screen.findByText("Anomalies")).toBeInTheDocument(); // Ensure Anomalies component renders
  });

  it("should handle anomalies checkbox with file upload and processing", async () => {
    mockAxios
      .onPost("/process")
      .reply(200, { url: "http://example.com", metadata: {} });

    render(
      <FileProvider>
        <Home />
      </FileProvider>
    );

    // Simulate checking the anomalies checkbox
    fireEvent.click(screen.getByLabelText("Anomalies"));

    const file = new File(["file content"], "test.csv", { type: "text/csv" });
    const input = screen.getByTestId("file-input");

    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText("Submit"));

    await waitFor(() => {
      expect(screen.getByText("Anomalies")).toBeInTheDocument(); // Ensure Anomalies component renders
    });

    expect(mockAxios.history.post.length).toBe(1);
    expect(mockAxios.history.post[0].url).toBe("http://localhost:3001/process");
  });
});
