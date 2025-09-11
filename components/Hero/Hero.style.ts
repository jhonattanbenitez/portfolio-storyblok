// Hero component styles using CSS modules approach
export const heroStyles = {
  section: `
    pt-[128px] lg:pt-32 lg:pb-16
    flex justify-center
    bg-muted
    text-foreground
  `,
  
  grid: `
    grid grid-cols-1 sm:grid-cols-12
  `,
  
  content: `
    col-span-8 place-self-center text-center sm:text-left justify-self-start
  `,
  
  title: `
    text-gray-900 dark:text-white mb-4 text-4xl sm:text-5xl lg:text-6xl lg:leading-normal font-extrabold
  `,
  
  titleGradient: `
    bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400
  `,
  
  imageContainer: `
    col-span-4 place-self-center mt-5 lg:mt-0
  `,
  
  profileImageWrapper: `
    rounded-full bg-gray-200 dark:bg-[#181818] w-[250px] h-[250px] lg:w-[400px] lg:h-[400px] relative
  `,
  
  profileImage: `
    absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 rounded-full
  `
};
