import { useState } from "react";
import { useRouter } from "next/router";
import { BsGithub } from "react-icons/bs";
import { usePostHog } from "posthog-js/react";
import { safeParse } from "valibot";
import Card from "components/atoms/Card/card";
import SingleSelect from "components/atoms/Select/single-select";
import { Dialog, DialogContent } from "components/molecules/Dialog/dialog";
import Button from "components/shared/Button/button";
import { fetchApiData } from "helpers/fetchApiData";
import useSupabaseAuth from "lib/hooks/useSupabaseAuth";
import { useToast } from "lib/hooks/useToast";
import Text from "components/atoms/Typography/text";
import { useFetchAllLists } from "lib/hooks/useList";
import useWorkspaces from "lib/hooks/api/useWorkspaces";
import { UuidSchema } from "lib/validation-schemas";

type AddToContributorInsightModalProps = {
  repository: string;
  contributors: string[];
  isOpen: boolean;
  onCloseModal: () => void;
};

export default function AddToContributorInsightModal({
  repository,
  contributors,
  isOpen,
  onCloseModal,
}: AddToContributorInsightModalProps) {
  const { toast } = useToast();
  const router = useRouter();
  const posthog = usePostHog();
  const { signIn, user, sessionToken } = useSupabaseAuth();
  const { data: contributorInsights, isLoading } = useFetchAllLists();
  const [workspaceId, setWorkspaceId] = useState("new");
  const { data: workspaces, isLoading: workspacesLoading, mutate } = useWorkspaces({ load: !!user, limit: 100 });

  const [selectedInsight, setSelectedInsight] = useState("new");

  const addToContributorInsight = async () => {
    posthog.capture(`Repo Pages: add to contributor insight`, {
      repository,
      count: contributors.length,
    });

    const { error } = await fetchApiData({
      method: "POST",
      path: `lists/${selectedInsight}/contributors`,
      body: {
        contributors: contributors.map((contributor) => {
          return { login: contributor };
        }),
      },
      bearerToken: sessionToken!,
      pathValidator: () => safeParse(UuidSchema, selectedInsight).success,
    });

    if (error) {
      toast({ description: `Error adding contributors to the insight. Please try again`, variant: "danger" });
    } else {
      toast({ description: `Added contributors successfully`, variant: "success" });
      onCloseModal();
    }
  };

  const createContributorInsight = async () => {
    posthog.capture(`Repo Pages: create new contributor insight`, {
      repository,
      count: contributors.length,
    });

    router.push(
      `/workspaces/${workspaceId}/contributor-insights/new?contributors=${encodeURIComponent(
        JSON.stringify(contributors)
      )}`
    );
    return;
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent autoStyle={false} onEscapeKeyDown={onCloseModal} onInteractOutside={onCloseModal}>
        <Card heading={<h1 className="text-xl font-semibold">Add to workspace</h1>}>
          <div className="flex flex-col gap-4 w-[32rem] h-full px-8 py-4">
            {!user ? (
              <div className="flex flex-col gap-4 text-center">
                <img
                  src="/assets/workspace_overview.png"
                  alt="Workspace screenshot from documentation"
                  className="border-2 border-light-orange-9 shadow-md rounded-lg"
                />
                <Text>
                  Keep track of repositories and contributors easily with our new feature
                  <span className="font-semibold"> Workspaces!</span> If you&apos;ve used OpenSauced before, your
                  insights and lists are now part of your personal workspace.
                </Text>
                <p className="font-medium text-light-orange-10">
                  Create a new contributor insight on a workspace and explore open source like never before!
                </p>
                <Button
                  variant="primary"
                  className="w-fit gap-2 self-center"
                  onClick={() => {
                    signIn({
                      provider: "github",
                    });
                  }}
                >
                  <BsGithub className="w-5 h-5" />
                  Connect with GitHub
                </Button>
              </div>
            ) : (
              <>
                <p>Create a new contributor insight or add to an existing one.</p>
                {isLoading ? (
                  <p>Loading...</p>
                ) : (
                  <SingleSelect
                    options={[
                      { label: "Create new insight...", value: "new" },
                      ...contributorInsights.map(({ id, name }) => ({
                        label: name,
                        value: id,
                      })),
                    ]}
                    value={selectedInsight ?? "new"}
                    placeholder="Select a workspace"
                    onValueChange={(value) => {
                      setSelectedInsight(value);
                    }}
                  />
                )}

                {selectedInsight === "new" &&
                  (workspacesLoading ? (
                    <p>Loading...</p>
                  ) : (
                    <SingleSelect
                      options={[
                        ...workspaces.map(({ id, name }) => ({
                          label: name,
                          value: id,
                        })),
                      ]}
                      value={workspaceId}
                      placeholder="Select a workspace"
                      onValueChange={(value) => {
                        setWorkspaceId(value);
                      }}
                    />
                  ))}

                <Button
                  onClick={selectedInsight === "new" ? createContributorInsight : addToContributorInsight}
                  variant="primary"
                  className="w-fit self-end"
                >
                  Confirm
                </Button>
              </>
            )}
          </div>
        </Card>
      </DialogContent>
    </Dialog>
  );
}