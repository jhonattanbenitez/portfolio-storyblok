interface DateFormatOptions {
    year: 'numeric';
    month: 'long';
    day: 'numeric';
}

const formatDate = (dateString: string): string => {
    const date = new Date(dateString.replace(" ", "T")); // Ensure correct format for Date parsing
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    } as DateFormatOptions);
};

export default formatDate;