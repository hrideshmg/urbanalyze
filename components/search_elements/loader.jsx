import { useCoords } from "@/app/_context/CoordsContext"

export default function Loader() {
    const { progress } = useCoords();
    var progress_len = progress.messages && progress.target_len > 0
        ? (1 - ((progress.target_len - progress.messages.length)) / progress.target_len) * 100
        : 0;
    // if (progress_len>100) {
    //     var value=progress_len/100;
    //     progress_len=progress_len-100*value;
    // }
    // console.log("Progress bar length : ",progress_len);
    const formattedProgressBar = progress_len.toFixed(2);
    return (
        <div className="flex flex-col w-[40vw] h-[10vw] rounded-xl bg-light items-center pr-6 pl-6">
            <div class="w-full bg-light rounded-full h-2.5 pt-[3vw] pb-4 ">
                <div class="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress_len.toFixed(0)}%` }}></div>
            </div>
            <p className="text-xl pb-3 font-bold">{`${formattedProgressBar}%`}</p>
            <p className="text-xl pb-3 font-bold">
                {progress.messages && progress.messages.length > 0
                    ? `${progress.messages[progress.messages.length - 1]}`
                    : "No messages available"}
            </p>
            {/* <p className="min-w-[40vw] bg-light flex justify-center items-center flex-col rounded-[2vw]">Loading....</p> */}
        </div>
    )
}