"use client";

import { useState, useEffect, type ComponentProps } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import Icon from "@/components/base-ui/icon";
import { useExplorer } from "@/hooks/use-explorer";
import ExplorerItem from "@/components/sidebar/explorer-item";
import { useTranslations } from "next-intl";

export const AppSidebar = ({ ...props }: ComponentProps<typeof Sidebar>) => {
  const t = useTranslations("sidebar");
  const { setOpen, open, openMobile, isMobile, setOpenMobile } = useSidebar();
  const [activeTab, setActiveTab] = useState<"explorer" | "search" | "none">("explorer");
  const { itemList } = useExplorer();

  useEffect(() => {
    if (isMobile && openMobile) {
      setActiveTab("explorer");
    }
  }, [isMobile, openMobile]);

  useEffect(() => {
    if (!open) {
      // 사이드바가 다른 수단(예: meta+b)으로 닫힐 때, 필요한 경우 시각적 상태를 동기화할 수 있습니다.
    }
  }, [open]);

  const handleTabClick = (tab: "explorer" | "search") => {
    if (activeTab === tab) {
      if (open) {
        setOpen(false);
      } else {
        setOpen(true);
      }
    } else {
      setActiveTab(tab);
      setOpen(true);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props} className="border-r-0 bg-gray-900 text-gray-100">
      <div className="flex h-full w-full flex-row overflow-hidden">
        {/* 활동 바 (아이콘) - 고정 너비 */}
        <div className="flex w-[3rem] flex-none flex-col items-center gap-2 border-r border-gray-800 bg-gray-900 py-2 z-20">
          <button
            data-active={activeTab === "explorer" && (open || (isMobile && openMobile))}
            onClick={() => handleTabClick("explorer")}
            className="flex size-10 items-center justify-center rounded-none text-gray-400 hover:text-gray-100 data-[active=true]:border-l-2 data-[active=true]:border-l-blue-300 data-[active=true]:text-gray-100"
            title={t("explorer")}
          >
            <Icon kind="content_copy" size={24} />
          </button>
          <button
            data-active={activeTab === "search" && (open || (isMobile && openMobile))}
            onClick={() => handleTabClick("search")}
            className="flex size-10 items-center justify-center rounded-none text-gray-400 hover:text-gray-100 data-[active=true]:border-l-2 data-[active=true]:border-l-blue-300 data-[active=true]:text-gray-100"
            title={t("search")}
          >
            <Icon kind="search" size={24} />
          </button>
        </div>

        {/* 콘텐츠 패널 (Push) */}
        {(open || (isMobile && openMobile)) && (
          <SidebarContent className="flex-1 bg-gray-900 border-r border-gray-500 min-w-0">
            <SidebarGroup className="p-0 h-full">
              {activeTab === "explorer" && (
                <div className="flex flex-col h-full overflow-y-auto py-2">
                  <div className="text-xs font-bold text-gray-400 mb-2 px-2">
                    {t("explorer").toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-y-1.5 px-2">
                    {itemList.map(item => (
                      <ExplorerItem
                        key={`tree_${item.id}`}
                        {...item}
                        tabClose={() => {
                          if (isMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "search" && (
                <div className="flex flex-col px-4 py-2 h-full">
                  <div className="text-xs font-bold text-gray-400 mb-2">
                    {t("search").toUpperCase()}
                  </div>
                  <div className="mt-4 text-xs text-center text-gray-500">
                    {t("searchDisabled")}
                  </div>
                </div>
              )}
            </SidebarGroup>
          </SidebarContent>
        )}
      </div>
      <SidebarRail />
    </Sidebar>
  );
};
