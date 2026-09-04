type LogoProps = {
  class?: string;
  title?: string;
};

const logoSrc = typeof chrome !== 'undefined' && chrome.runtime?.getURL
  ? chrome.runtime.getURL('leetcopilot-logo.png')
  : '/leetcopilot-logo.png';

export function LeetCopilotLogo(props: LogoProps) {
  return <img class={props.class} src={logoSrc} alt={props.title ?? ''} aria-hidden={props.title ? undefined : true} />;
}
