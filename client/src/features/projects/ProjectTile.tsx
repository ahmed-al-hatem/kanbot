import { memo, useRef, type CSSProperties } from 'react';
import { Link, useNavigate } from 'react-router';
import { IconButton } from '@/components/Button/Button';
import { Lozenge } from '@/components/Lozenge/Lozenge';
import { Menu, MenuItem, MenuSeparator } from '@/components/Menu/Menu';
import { ProjectAvatar } from '@/components/ProjectAvatar/ProjectAvatar';
import { useT } from '@/i18n';
import { cx } from '@/lib/cx';
import type { ProjectWithStats } from '@/types/api';
import styles from './ProjectsPage.module.css';

type TileAction = 'edit' | 'delete';

interface ProjectTileProps {
  project: ProjectWithStats;
  /** Position in the grid, for the mount stagger (DESIGN §8.2). */
  index: number;
  /** Just created: plays `kbAdded` (DESIGN §9 03). */
  highlighted: boolean;
  onEdit: (project: ProjectWithStats) => void;
  onDelete: (project: ProjectWithStats) => void;
  onPrefetch: (projectId: string) => void;
}

/**
 * DESIGN §7 Project tile (PRJ-1): avatar, name, key, description, backlog count and the
 * active sprint. The name is a stretched link, so the whole tile opens the backlog; the ⋯
 * menu (Open / Edit / Delete) sits above it. Hover or focus prefetches the project.
 */
export const ProjectTile = memo(function ProjectTile({
  project,
  index,
  highlighted,
  onEdit,
  onDelete,
  onPrefetch,
}: ProjectTileProps) {
  const t = useT();
  const navigate = useNavigate();
  const backlogPath = `/projects/${project.id}/backlog`;
  // Edit and Delete open a dialog once the menu has handed focus back to ⋯ (see Menu).
  const pendingAction = useRef<TileAction | null>(null);
  const { activeSprint } = project.stats;
  const prefetch = () => {
    onPrefetch(project.id);
  };

  return (
    <article
      className={cx(styles.tile, 'kb-rise', 'kb-stagger', highlighted && 'kb-added')}
      style={{ '--i': index } as CSSProperties}
      onPointerEnter={prefetch}
      onFocus={prefetch}
    >
      <div className={styles.tileHead}>
        <ProjectAvatar id={project.id} name={project.name} size={40} />
        <div className={styles.tileTitle}>
          <h2 className={styles.tileName}>
            <Link to={backlogPath} className={styles.stretch} data-project-focus={project.id}>
              {project.name}
            </Link>
          </h2>
          <Lozenge className={styles.tileKey}>{project.key}</Lozenge>
        </div>
        <div className={styles.over}>
          <Menu
            label={t.projects.tile.menu(project.name)}
            onCloseAutoFocus={() => {
              const action = pendingAction.current;
              pendingAction.current = null;
              if (action === 'edit') onEdit(project);
              if (action === 'delete') onDelete(project);
            }}
            trigger={
              <IconButton
                size="sm"
                icon="show-more-horizontal"
                aria-label={t.projects.tile.actions(project.name)}
              />
            }
          >
            <MenuItem
              icon="arrow-right"
              onSelect={() => {
                void navigate(backlogPath);
              }}
            >
              {t.common.open}
            </MenuItem>
            <MenuItem
              icon="pencil"
              onSelect={() => {
                pendingAction.current = 'edit';
              }}
            >
              {t.common.edit}
            </MenuItem>
            <MenuSeparator />
            <MenuItem
              icon="delete"
              tone="danger"
              onSelect={() => {
                pendingAction.current = 'delete';
              }}
            >
              {t.common.delete}
            </MenuItem>
          </Menu>
        </div>
      </div>

      <p
        className={cx(styles.tileDescription, !project.description && styles.tileDescriptionEmpty)}
      >
        {project.description || t.projects.tile.noDescription}
      </p>

      <div className={styles.tileFooter}>
        <span>{t.count.backlogTodos(project.stats.backlogCount)}</span>
        {activeSprint ? (
          <Lozenge tone="blue" live>
            {t.projects.tile.activeSprint(activeSprint.name)}
          </Lozenge>
        ) : (
          <span>{t.projects.tile.noActiveSprint}</span>
        )}
      </div>
    </article>
  );
});
