import React from 'react'
import { assets } from '../../assets/assets'
import SearchBar from './SearchBar'
const Hero = () => {
  return (
    <div className='flex flex-col items-center justify-center w-full md:pt-36 pt-20 px-7 md:px-0 space-y-7 text-center bg-gradient-to-b from-cyan-100/70 '>

      <h1 className='md:text-home-heading-large text-home-heading-small relative font-bold text-gray-800 max-w-3xl mx-auto'>Empower Your Future with <span className='text-blue-600'>Skill-Based Learning</span><span className='text-blue-600'><img src={assets.sketch} alt='sketch' className='md:block hidden absolute -bottom-7 right-0'/></span></h1>

      <p className='md:block hidden text-gray-500 max-w-2xl mx-auto'>Learn new skills anytime, anywhere with our online learning platform. Explore expert-led courses, earn certificates, and boost your career – all in one place.</p>

      <p className='md:hidden text-gray-500 max-w-sm mx-auto'>Learn new skills anytime, anywhere with our online learning platform. Explore expert-led courses, earn certificates, and boost your career – all in one place.</p>
    <SearchBar />
    </div>
  )
}

export default Hero
