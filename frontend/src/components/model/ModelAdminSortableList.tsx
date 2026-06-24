import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ComponentProps } from 'react'
import type { AiModel } from '@/types/model'
import { ModelAdminCard, type ModelTestResult } from '@/components/model/ModelAdminCard'

interface SortableCardProps {
  model: AiModel
  busy?: boolean
  testing?: boolean
  testResult?: ModelTestResult
  canMoveUp?: boolean
  canMoveDown?: boolean
  labels: ComponentProps<typeof ModelAdminCard>['labels']
  onTest: () => void
  onEdit: () => void
  onSetDefault: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}

function SortableModelAdminCard(props: SortableCardProps) {
  const { model, ...rest } = props
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: model.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'opacity-90' : undefined}>
      <ModelAdminCard
        model={model}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        {...rest}
      />
    </div>
  )
}

interface ModelAdminSortableListProps {
  models: AiModel[]
  busyId: string | null
  testingId: string | null
  testResults: Record<string, ModelTestResult>
  labels: SortableCardProps['labels']
  onReorder: (next: AiModel[]) => void
  onTest: (id: string) => void
  onEdit: (model: AiModel) => void
  onSetDefault: (id: string) => void
  onDelete: (model: AiModel) => void
  onMove: (id: string, direction: -1 | 1) => void
}

export function ModelAdminSortableList({
  models,
  busyId,
  testingId,
  testResults,
  labels,
  onReorder,
  onTest,
  onEdit,
  onSetDefault,
  onDelete,
  onMove,
}: ModelAdminSortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = models.findIndex((m) => m.id === active.id)
    const newIndex = models.findIndex((m) => m.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(models, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={models.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {models.map((m, idx) => (
            <SortableModelAdminCard
              key={m.id}
              model={m}
              busy={busyId === m.id}
              testing={testingId === m.id}
              testResult={testResults[m.id]}
              canMoveUp={idx > 0}
              canMoveDown={idx < models.length - 1}
              labels={labels}
              onTest={() => onTest(m.id)}
              onEdit={() => onEdit(m)}
              onSetDefault={() => onSetDefault(m.id)}
              onDelete={() => onDelete(m)}
              onMoveUp={() => onMove(m.id, -1)}
              onMoveDown={() => onMove(m.id, 1)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
