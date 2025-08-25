import Link from 'next/link';
import React from 'react'
import { TbBrandFiverr, TbBrandGithub, TbBrandLinkedin } from 'react-icons/tb';

const SocialLinks = () => {
  return (
    <div className="flex justify-center sm:justify-start space-x-4 mt-8">
      <Link
        href="https://www.linkedin.com/in/jhonattan-benitez-752b3650/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <TbBrandLinkedin size={32} />
      </Link>
      <Link
        href="https://github.com/jhonattanbenitez/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
      >
        <TbBrandGithub size={32} />
      </Link>
      <Link
        href="https://www.fiverr.com/jhonattanb07"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 dark:text-white hover:text-green-600 dark:hover:text-green-400 transition-colors"
      >
        <TbBrandFiverr size={32} />
      </Link>
    </div>
  );
}

export default SocialLinks
