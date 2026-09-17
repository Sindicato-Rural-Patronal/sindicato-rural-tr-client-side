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
  status: 'PUBLIC' | 'PRIVATE' | 'UNPUBLISHED' | 'IN_PROGRESS' | 'COMPLETED'
  title: string
  description: string
  maxStudents: number
  minStudents: number
  enrolled: number
  preEnrolled: number
  waitlist: number
  coverImage: string | null
  /** Miniatura WebP (~640px) da capa, para cards; null/ausente → usar coverImage. */
  coverImageThumb?: string | null
  price: number
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  workloadHours: number
  location: string
  instructorName: string
  /** Dia do prazo de inscrição, "YYYY-MM-DD". */
  registrationDeadline: string | null
  /** Hora do prazo "HH:MM" (Brasília) quando informada; null/ausente = vale o dia inteiro. */
  registrationDeadlineTime?: string | null
  observations: string | null
  eventNumber: string | null
  photoGallery: { id: string; url: string; caption: string }[]
  instructors: CourseInstructor[]
}
