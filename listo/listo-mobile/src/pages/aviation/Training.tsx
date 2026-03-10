import React from 'react';
import { NavBar, ErrorBlock } from 'antd-mobile';
import { UnorderedListOutline } from 'antd-mobile-icons';
import { useMenu } from '../../contexts/MenuContext';

const Training: React.FC = () => {
  const { openMenu } = useMenu();

  return (
    <>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
      >
        Training
      </NavBar>
      <ErrorBlock status="empty" title="Coming Soon" description="Training tracker will be available here" />
    </>
  );
};

export default Training;
