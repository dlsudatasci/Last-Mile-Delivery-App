export const formatTime = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    if (hours === 0) {
        return `${formattedMinutes}:${formattedSeconds}`;
    }

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

export const formatDuration = (timeInSeconds: number): string => {
    const hours = Math.floor(timeInSeconds / 3600);
    const minutes = Math.floor((timeInSeconds % 3600) / 60);
    const seconds = Math.floor(timeInSeconds % 60);

    const formattedHours = String(hours);
    const formattedMinutes = String(minutes);
    const formattedSeconds = String(seconds);

    let formattedDuration = '';
    if (hours > 0) {
        formattedDuration += `${formattedHours}h `;
    }
    if (hours === 0) {
        formattedDuration += `${formattedMinutes}m `;
    }
    if (minutes === 0) {
        formattedDuration += `${formattedSeconds}s`;
    }

    return formattedDuration;
};
