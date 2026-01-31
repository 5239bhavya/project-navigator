import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Plus, Archive } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showHome?: boolean;
  showNew?: boolean;
  showArchived?: boolean;
  onNew?: () => void;
  onShowArchived?: () => void;
  isShowingArchived?: boolean;
  children?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  showHome = true,
  showNew = false,
  showArchived = false,
  onNew,
  onShowArchived,
  isShowingArchived = false,
  children,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-4">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h1 className="text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {showHome && (
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        )}
        {showArchived && (
          <Button
            variant={isShowingArchived ? 'secondary' : 'outline'}
            size="sm"
            onClick={onShowArchived}
          >
            <Archive className="mr-2 h-4 w-4" />
            {isShowingArchived ? 'Show Active' : 'Archived'}
          </Button>
        )}
        {showNew && (
          <Button size="sm" onClick={onNew}>
            <Plus className="mr-2 h-4 w-4" />
            New
          </Button>
        )}
        {children}
      </div>
    </div>
  );
}
