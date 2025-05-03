import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css'; // Import Quill styles
import { assets } from '../../assets/assets';
import uniqid from 'uniqid'; // Import uniqid for unique IDs

const AddCourse = () => {
  const editorRef = useRef(null);

  const [courseTitle, setCourseTitle] = useState('');
  const [coursePrice, setCoursePrice] = useState(0);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [chapters, setChapters] = useState([]); // Initialize chapters as an empty array
  const [showPopup, setShowPopup] = useState(false); // Define showPopup state
  const [currentChapterId, setCurrentChapterId] = useState(null); // Track the current chapter for adding a lecture
  const [lectureDetails, setLectureDetails] = useState({
    lectureTitle: '',
    lectureDuration: '',
    lectureUrl: '',
    isPreviewFree: false,
  });

  const handleChapter = (action, chapterId) => {
    if (action === 'add') {
      const title = prompt('Enter chapter name:');
      if (title) {
        const newChapter = {
          chapterId: uniqid(),
          chapterTitle: title,
          chapterContent: [],
          collapsed: false,
          chapterOrder: chapters.length > 0 ? chapters[chapters.length - 1].chapterOrder + 1 : 1,
        };
        setChapters([...chapters, newChapter]); // Append the new chapter to the array
      }
    } else if (action === 'remove') {
      setChapters(chapters.filter((chapter) => chapter.chapterId !== chapterId));
    } else if (action === 'toggle') {
      setChapters(
        chapters.map((chapter) =>
          chapter.chapterId === chapterId ? { ...chapter, collapsed: !chapter.collapsed } : chapter
        )
      );
    }
  };

  const handleLecture = (action, chapterId, lectureIndex) => {
    if (action === 'add') {
      setCurrentChapterId(chapterId);
      setShowPopup(true); // Show the popup
    } else if (action === 'remove') {
      setChapters(
        chapters.map((chapter) => {
          if (chapter.chapterId === chapterId) {
            chapter.chapterContent.splice(lectureIndex, 1);
          }
          return chapter;
        })
      );
    }
  };

  const handleAddLecture = () => {
    if (
      lectureDetails.lectureTitle &&
      lectureDetails.lectureDuration &&
      lectureDetails.lectureUrl
    ) {
      setChapters(
        chapters.map((chapter) =>
          chapter.chapterId === currentChapterId
            ? {
                ...chapter,
                chapterContent: [
                  ...chapter.chapterContent,
                  {
                    lectureTitle: lectureDetails.lectureTitle,
                    lectureDuration: lectureDetails.lectureDuration,
                    lectureUrl: lectureDetails.lectureUrl,
                    isPreviewFree: lectureDetails.isPreviewFree,
                  },
                ],
              }
            : chapter
        )
      );
      setShowPopup(false); // Close the popup
      setLectureDetails({
        lectureTitle: '',
        lectureDuration: '',
        lectureUrl: '',
        isPreviewFree: false,
      }); // Reset lecture details
    } else {
      alert('Please fill in all lecture details.');
    }
  };

  useEffect(() => {
    // Initialize Quill only once
    if (editorRef.current) {
      new Quill(editorRef.current, {
        theme: 'snow', // Use a valid theme
      });
    }
  }, []);

  useEffect(() => {
    // Clean up object URL for image preview
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className='h-screen overflow-scroll flex flex-col items-start justify-between md:p-8 md:pb-0 p-4 pt-8 pb-0'>
      <form className='flex flex-col gap-4 max-w-md w-full text-gray-500'>
        <div className='flex flex-col gap-1'>
          <p>Course Title</p>
          <input
            type="text"
            onChange={(e) => setCourseTitle(e.target.value)}
            value={courseTitle}
            placeholder='Type here'
            className='outline-none md:py-2.5 py-2 px-3 rounded border border-gray-500'
            required
          />
        </div>
        <div className='flex flex-col gap-1'>
          <p>Course Description</p>
          <div
            ref={editorRef}
            className='h-40 border border-gray-500 rounded' // Add height and border for visibility
          ></div>
        </div>

        <div className='flex items-center justify-between flex-wrap'>
          <div className='flex flex-col gap-1'>
            <p>Course Price</p>
            <input
              type="number"
              onChange={(e) => setCoursePrice(e.target.value)}
              value={coursePrice}
              placeholder='0'
              className='outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500'
              required
            />
          </div>

          <div className='flex md:flex-row flex-col items-center gap-3'>
            <p>Course Thumbnail</p>
            <label htmlFor="thumbnailImage" className='flex items-center gap-3'>
              <img
                src={assets.file_upload_icon}
                alt="Upload Icon"
                className='p-3 bg-blue-500 rounded'
              />
              <input
                type="file"
                id="thumbnailImage"
                onChange={handleImageChange}
                accept='image/*'
                hidden
              />
              {imagePreview && (
                <img
                  className='max-h-10'
                  src={imagePreview}
                  alt="Course Thumbnail Preview"
                />
              )}
            </label>
          </div>
        </div>

        <div className='flex flex-col gap-1'>
          <p>Discount %</p>
          <input
            type="number"
            onChange={(e) => setDiscount(e.target.value)}
            value={discount}
            placeholder='0'
            min={0}
            max={100}
            className='outline-none md:py-2.5 py-2 w-28 px-3 rounded border border-gray-500'
            required
          />
        </div>

        {/* Adding Chapters and Lectures */}
        <div>
          {chapters.map((chapter, chapterIndex) => (
            <div key={chapterIndex} className='bg-white border rounded-lg mb-4'>
              <div className='flex justify-between items-center p-4 border-b'>
                <div className='flex items-center'>
                  <img onClick={() => handleChapter('toggle', chapter.chapterId)}
                    src={assets.dropdown_icon}
                    width={14}
                    alt="Dropdown Icon"
                    className={`mr-2 cursor-pointer transition-all ${
                      chapter.collapsed && '-rotate-90'
                    }`}
                    onClick={() => handleChapter('toggle', chapter.chapterId)}
                  />
                  <span className='font-semibold'>
                    {chapterIndex + 1}. {chapter.chapterTitle}
                  </span>
                </div>
                <span className='text-gray-500'>
                  {chapter.chapterContent?.length || 0} Lectures
                </span>
                <img
                  src={assets.cross_icon}
                  alt="Remove Chapter Icon"
                  className='cursor-pointer'
                  onClick={() => handleChapter('remove', chapter.chapterId)}
                />
              </div>

              {!chapter.collapsed && (
                <div className='p-4'>
                  {chapter.chapterContent?.map((lecture, lectureIndex) => (
                    <div
                      key={lectureIndex}
                      className='flex justify-between items-center mb-2'
                    >
                      <span>
                        {lectureIndex + 1}. {lecture.lectureTitle} -{' '}
                        {lecture.lectureDuration} minutes -{' '}
                        <a
                          href={lecture.lectureUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-500'
                        >
                          Link
                        </a>{' '}
                        - {lecture.isPreviewFree ? 'Free Preview' : 'Paid'}
                      </span>
                      <img
                        src={assets.cross_icon}
                        alt="Remove Lecture Icon"
                        onClick={() =>
                          handleLecture('remove', chapter.chapterId, lectureIndex)
                        }
                        className='cursor-pointer'
                      />
                    </div>
                  ))}
                  <div
                    className='inline-flex bg-gray-100 p-2 rounded cursor-pointer mt-2'
                    onClick={() => handleLecture('add', chapter.chapterId)}
                  >
                    + Add Lecture
                  </div>
                </div>
              )}
            </div>
          ))}
          <div
            className='flex justify-center items-center bg-blue-100 p-2 rounded-lg cursor-pointer'
            onClick={() => handleChapter('add')}
          >
            + Add Chapter
          </div>
        </div>

        {/* Popup for Adding Lecture */}
        {showPopup && (
          <div className='fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50'>
            <div className='bg-white p-6 rounded shadow-lg w-96'>
              <h2 className='text-lg font-semibold mb-4'>Add Lecture</h2>
              <div className='mb-2'>
                <label className='block mb-1'>Lecture Title</label>
                <input
                  type='text'
                  className='w-full border rounded px-3 py-2'
                  value={lectureDetails.lectureTitle}
                  onChange={(e) =>
                    setLectureDetails({
                      ...lectureDetails,
                      lectureTitle: e.target.value,
                    })
                  }
                />
              </div>
              <div className='mb-2'>
                <label className='block mb-1'>Lecture Duration (minutes)</label>
                <input
                  type='number'
                  className='w-full border rounded px-3 py-2'
                  value={lectureDetails.lectureDuration}
                  onChange={(e) =>
                    setLectureDetails({
                      ...lectureDetails,
                      lectureDuration: e.target.value,
                    })
                  }
                />
              </div>
              <div className='mb-2'>
                <label className='block mb-1'>Lecture URL</label>
                <input
                  type='text'
                  className='w-full border rounded px-3 py-2'
                  value={lectureDetails.lectureUrl}
                  onChange={(e) =>
                    setLectureDetails({
                      ...lectureDetails,
                      lectureUrl: e.target.value,
                    })
                  }
                />
              </div>
              <div className='mb-4'>
                <label className='block mb-1'>Free Preview</label>
                <input
                  type='checkbox'
                  checked={lectureDetails.isPreviewFree}
                  onChange={(e) =>
                    setLectureDetails({
                      ...lectureDetails,
                      isPreviewFree: e.target.checked,
                    })
                  }
                />
              </div>
              <div className='flex justify-end'>
                <button
                  className='bg-gray-500 text-white px-4 py-2 rounded mr-2'
                  onClick={() => setShowPopup(false)}
                >
                  Cancel
                </button>
                <button
                  className='bg-blue-500 text-white px-4 py-2 rounded'
                  onClick={handleAddLecture}
                >
                  Add Lecture
                </button>
              </div>
            </div>
          </div>
        )}

        <button type='submit' className='bg-black text-white w-max py-2.5 px-8 rounded my-4'>
          ADD
        </button>
      </form>
    </div>
  );
};

export default AddCourse;