"use client";

import { HTMLAttributes } from "react";
import {
  XMarkIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  ChevronDownIcon,
  DocumentDuplicateIcon,
  EnvelopeIcon,
  PhoneIcon,
  BookmarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  UserIcon,
  MapIcon,
  DocumentTextIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  CommandLineIcon,
  ComputerDesktopIcon,
  DocumentIcon,
  ArrowDownCircleIcon,
  FolderIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  Bars3Icon,
  ServerIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";

export type TKind =
  | "close"
  | "chevron_right"
  | "chevron_left"
  | "content_copy"
  | "mail"
  | "call"
  | "bookmark"
  | "navigation"
  | "navigate_next"
  | "account_box"
  | "hiking"
  | "article"
  | "content_paste_search"
  | "keyboard_arrow_down"
  | "keyboard_arrow_right"
  | "expand_more"
  | "schedule"
  | "terminal"
  | "computer"
  | "description"
  | "arrow_circle_down"
  | "folder"
  | "arrow_back"
  | "calendar_today"
  | "search"
  | "view_column"
  | "view_list"
  | "hard_drive"
  | "check";

interface IIconProps extends HTMLAttributes<SVGSVGElement> {
  kind: TKind;
  size?: number;
}

const iconMap: Record<TKind, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  close: XMarkIcon,
  chevron_right: ChevronRightIcon,
  chevron_left: ChevronLeftIcon,
  content_copy: DocumentDuplicateIcon,
  mail: EnvelopeIcon,
  call: PhoneIcon,
  bookmark: BookmarkIcon,
  navigation: ArrowRightIcon,
  navigate_next: ChevronRightIcon,
  account_box: UserIcon,
  hiking: MapIcon,
  article: DocumentTextIcon,
  content_paste_search: ClipboardDocumentListIcon,
  keyboard_arrow_down: ChevronDownIcon,
  keyboard_arrow_right: ChevronRightIcon,
  expand_more: ChevronDownIcon,
  schedule: ClockIcon,
  terminal: CommandLineIcon,
  computer: ComputerDesktopIcon,
  description: DocumentIcon,
  arrow_circle_down: ArrowDownCircleIcon,
  folder: FolderIcon,
  arrow_back: ArrowLeftIcon,
  calendar_today: CalendarIcon,
  search: MagnifyingGlassIcon,
  view_column: ViewColumnsIcon,
  view_list: Bars3Icon,
  hard_drive: ServerIcon,
  check: CheckIcon,
};

const Icon = ({ kind, size = 20, className, style, ...restProps }: IIconProps) => {
  const IconComponent = iconMap[kind];

  if (!IconComponent) {
    return null;
  }

  return (
    <IconComponent
      className={className}
      style={{ width: size, height: size, ...style }}
      {...restProps}
    />
  );
};

export default Icon;
