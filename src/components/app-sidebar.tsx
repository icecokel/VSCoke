"use client";

import * as React from "react";
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

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("sidebar");
  const { setOpen, open, openMobile, isMobile, setOpenMobile } = useSidebar();
  const [activeTab, setActiveTab] = React.useState<"explorer" | "search" | "none">("explorer");
  const { itemList } = useExplorer();

  React.useEffect(() => {
    if (isMobile && openMobile) {
      setActiveTab("explorer");
    }
  }, [isMobile, openMobile]);

  React.useEffect(() => {
    if (!open) {
      // When sidebar closes via other means (e.g. meta+b), we might want to sync visual state if needed.
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
        {/* Activity Bar (Icons) - Fixed Width */}
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

        {/* Content Panel (Push) */}
        {(open || (isMobile && openMobile)) && (
          <SidebarContent className="flex-1 bg-gray-900 border-r border-gray-500 min-w-0">
            <SidebarGroup className="p-0 h-full">
              {activeTab === "explorer" && (
                <div className="flex flex-col gap-y-1 p-2 h-full overflow-y-auto">
                  <div className="text-xs font-bold text-gray-400 mb-2 px-2">
                    {t("explorer").toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-y-1 px-2">
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
}
