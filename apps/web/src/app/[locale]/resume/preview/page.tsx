import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import RESUME_DATA from "@/constants/resume-data.json";
import type { Description } from "@/components/profile/resume/types";
import { ResumePreviewActions } from "@/features/resume-preview/components/resume-preview-actions";

type ResumeContact = {
  email: string;
  phone: string;
};

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("resumePreview");

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
};

const ResumePreviewPage = async () => {
  const [t, tResume] = await Promise.all([
    getTranslations("resumePreview"),
    getTranslations("resume"),
  ]);
  const tDescription = await getTranslations("descriptionItem");
  const contact = tResume.raw("contact") as ResumeContact;
  const introduction = tResume.raw("introduction") as string[];

  return (
    <main className="resume-preview-page min-h-full bg-gray-800 px-3 py-4 text-gray-100 md:px-5 md:py-8">
      <ResumePreviewActions />

      <article
        className="resume-preview-document mx-auto w-full max-w-[210mm] bg-beige-400 px-6 py-8 text-gray-900 shadow-2xl shadow-black/30 sm:px-10 sm:py-12"
        data-testid="resume-preview-document"
      >
        <header className="resume-preview-header border-b-2 border-gray-900 pb-6">
          <p className="text-xs font-bold tracking-[0.24em] text-blue-500">{t("documentType")}</p>
          <div className="resume-preview-header-content mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{tResume("name")}</h1>
              <p className="mt-2 max-w-xl text-base leading-6 text-gray-700">{tResume("title")}</p>
            </div>
            <dl className="resume-preview-contact shrink-0 space-y-1 text-sm text-gray-700 sm:text-right">
              <div>
                <dt className="sr-only">{t("email")}</dt>
                <dd>{contact.email}</dd>
              </div>
              <div>
                <dt className="sr-only">{t("phone")}</dt>
                <dd>{contact.phone}</dd>
              </div>
            </dl>
          </div>
        </header>

        <section className="resume-preview-summary border-b border-gray-300 py-6">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-blue-500">
            {t("summary")}
          </h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-gray-700">
            {introduction.map(summary => (
              <p key={summary}>{summary}</p>
            ))}
          </div>
        </section>

        <section className="resume-preview-experience py-6">
          <div className="flex items-baseline justify-between gap-4 border-b border-gray-300 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-blue-500">
              {t("experience")}
            </h2>
            <p className="text-xs text-gray-600">
              {t("totalExperience", { value: tResume("totalExperience") })}
            </p>
          </div>

          <div className="divide-y divide-gray-300">
            {RESUME_DATA.map(career => {
              const careerKey = `careers.${career.id}`;

              return (
                <section
                  key={career.id}
                  className="resume-preview-career py-5 first:pt-4 last:pb-0"
                >
                  <div className="resume-preview-career-heading flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        {tResume(`${careerKey}.company`)}
                      </h3>
                      <p className="mt-1 text-sm font-medium text-gray-700">
                        {tResume(`${careerKey}.role`)} · {tResume(`${careerKey}.employmentType`)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-gray-600">
                      {tResume(`${careerKey}.period`)}
                    </p>
                  </div>

                  <div className="mt-4 space-y-5">
                    {career.projects.map(project => {
                      const projectKey = `${careerKey}.projects.${project.id}`;
                      const descriptions = tResume.raw(
                        `${projectKey}.descriptions`,
                      ) as Description[];

                      return (
                        <article key={project.id} className="resume-preview-project">
                          <h4 className="text-sm font-bold text-gray-900">
                            {tResume(`${projectKey}.title`)}
                          </h4>
                          {tResume.has(`${projectKey}.period`) && (
                            <p className="mt-1 text-xs text-gray-600">
                              {tResume(`${projectKey}.period`)}
                            </p>
                          )}

                          <div className="mt-3 space-y-4">
                            {descriptions.map((description, descriptionIndex) => (
                              <section
                                key={`${description.subtitle}-${descriptionIndex}`}
                                className="resume-preview-description"
                              >
                                <h5 className="text-sm font-medium text-gray-800">
                                  {description.subtitle}
                                </h5>
                                {description.detail && (
                                  <p className="mt-2 text-sm leading-6 text-gray-700">
                                    {description.detail}
                                  </p>
                                )}
                                {description.skills && (
                                  <p className="mt-2 text-xs leading-5 text-gray-600">
                                    <span className="font-semibold text-gray-700">
                                      {tDescription("techStack")}
                                    </span>{" "}
                                    {description.skills}
                                  </p>
                                )}
                                {description.tasks && description.tasks.length > 0 && (
                                  <ul className="mt-2 space-y-1.5 text-sm leading-6 text-gray-700">
                                    {description.tasks.map(task => (
                                      <li key={task} className="flex gap-2">
                                        <span
                                          className="mt-2.5 size-1 shrink-0 rounded-full bg-blue-400"
                                          aria-hidden="true"
                                        />
                                        <span>{task}</span>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </section>
                            ))}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <footer className="border-t border-gray-300 pt-4 text-xs text-gray-600">
          {t("updatedAt")}
        </footer>
      </article>
    </main>
  );
};

export default ResumePreviewPage;
