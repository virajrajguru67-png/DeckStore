interface VideoPreviewProps {
  url: string;
  fileName: string;
}

export function VideoPreview({ url, fileName }: VideoPreviewProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <video
        src={url}
        controls
        className="max-w-full max-h-full"
        controlsList="nodownload"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}


