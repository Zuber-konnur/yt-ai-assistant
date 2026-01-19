import yt_dlp

def get_video_id(query: str):
    options = {
        "quiet": True,
        "skip_download": True,
        "extract_flat": True
    }

    with yt_dlp.YoutubeDL(options) as ydl:
        info = ydl.extract_info(f"ytsearch1:{query}", download=False)
        if "entries" in info and info["entries"]:
            return info["entries"][0]["id"]
    return None
