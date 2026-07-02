export type CourseInstructor = {
  id: string
  userDataId: string
  title: string | null
  category: string | null
  name: string
  bio: string | null
  avatar: string | null
  linkedin: string | null
  instagram: string | null
  facebook: string | null
}

/** Shape returned by the backend — already English field names. */
export type Course = {
  id: string
  status: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED'
  title: string
  description: string
  maxStudents: number
  minStudents: number
  enrolled: number
  preEnrolled: number
  waitlist: number
  coverImage: string | null
  price: number
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  workloadHours: number
  location: string
  instructorName: string
  registrationDeadline: string | null
  observations: string | null
  eventNumber: string | null
  photoGallery: { id: string; url: string; caption: string }[]
  instructors: CourseInstructor[]
}

/** @deprecated Use Course instead */
export type ApiCourse = Course
/** @deprecated Use Course instead */
export type Curso = Course
