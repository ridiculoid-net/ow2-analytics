import { UploadAndParse } from "@/components/import/upload-and-parse";
import { StatusLine } from "@/components/status-line";

export default function ImportPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-5xl">
        <h1 className="font-display text-3xl md:text-4xl tracking-widest text-foreground">
          IMPORT
        </h1>
        <p className="mt-3 font-body text-muted-foreground max-w-2xl">
          Upload one scoreboard screenshot that includes <span className="text-primary">ridiculoid</span> and{" "}
          <span className="text-primary">buttstough</span>. OCR extracts rows; you confirm; we save.
        </p>
        <StatusLine left="SYSTEM ONLINE • IMPORT PIPELINE" right="UPLOAD → OCR → CONFIRM → SAVE" />
      </div>

      <div className="mt-6">
        <UploadAndParse />
      </div>
    </div>
  );
}
