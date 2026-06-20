import React from "react";
import { Document, Page, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { renderCertificateToCanvas } from "../lib/certificateRenderer";

// Simple landscape page styles
const styles = StyleSheet.create({
  page: {
    backgroundColor: "#faf6f0",
    padding: 0,
    margin: 0,
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "contain",
  },
});

// React PDF Document structure
export function BulkCertificatesDocument({ images }) {
  return (
    <Document>
      {images.map((imgUrl, index) => (
        <Page key={index} size="A4" orientation="landscape" style={styles.page}>
          <Image src={imgUrl} style={styles.image} />
        </Page>
      ))}
    </Document>
  );
}

// Helper to render and download bulk certificates as a single PDF
export async function downloadBulkCertificates(students, certTypeData) {
  const canvas = document.createElement("canvas");
  const images = [];

  for (const s of students) {
    const certId = `ST-${certTypeData.code || "CRT"}-${s.student_id?.slice(4, 10).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const dateStr = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const certData = {
      title: certTypeData.title,
      description: certTypeData.description,
      studentName: s.name,
      rollNumber: s.roll_number,
      branch: s.department || "CSE",
      collegeName: s.college_name || "Keshav Memorial Institute of Technology",
      certId: certId,
      date: dateStr,
      signatureTpo: "Dr. Neil Gogte",
      signatureSkillTank: "Skill Tank Director",
    };

    // Render this student's certificate to canvas and get base64 image URL
    const imgUrl = await renderCertificateToCanvas(canvas, certData);
    images.push(imgUrl);
  }

  // Create the PDF instance
  const docInstance = <BulkCertificatesDocument images={images} />;
  const blob = await pdf(docInstance).toBlob();

  // Trigger download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bulk_${certTypeData.code || "CRT"}_certificates.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
