interface AudioPreviewProps {
  url: string;
  fileName: string;
}

export function AudioPreview({ url, fileName }: AudioPreviewProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-muted/30 p-12">
      <div className="w-full max-w-md space-y-4">
        <div className="text-center">
          <p className="text-lg font-medium">{fileName}</p>
        </div>
        <audio src={url} controls className="w-full">
          Your browser does not support the audio element.
        </audio>
      </div>
    </div>
  );
}


